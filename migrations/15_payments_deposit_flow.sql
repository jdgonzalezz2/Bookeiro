-- P1.1 (Fase C2) — Flujo de abono con Wompi (modelo de cuenta conectada).
--
-- ⚠️ APLICAR por `db migrations up <ts>_...sql` (NO por db query: hay funciones
--    con cuerpo $$...$$). Ver migración 13.
--
-- Flujo aprobado: si el negocio activó abono, la cita se crea en 'pending'
-- (bloquea el horario), el cliente paga el abono, el webhook la pasa a
-- 'confirmed'; si no paga en 15 min, se auto-cancela y libera el slot.
--
-- SEGURIDAD: la firma de integridad (SHA256) se calcula server-side con pgcrypto
-- dentro de un RPC SECURITY DEFINER, leyendo el secreto de tenant_payment_secrets.
-- El secreto NUNCA sale del backend: el RPC solo devuelve la firma ya calculada +
-- la llave pública (que es exponible). El anon key jamás ve los secretos.

-- ---------------------------------------------------------------- tabla payments
CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id       UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reference            TEXT NOT NULL UNIQUE,
  amount_in_cents      BIGINT NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'COP',
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','APPROVED','DECLINED','VOIDED','ERROR')),
  wompi_transaction_id TEXT,
  is_sandbox           BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Solo el dueño ve sus pagos. Sin política pública/insert: las escrituras van por
-- RPCs SECURITY DEFINER (crear intento) y por el webhook (admin client).
DROP POLICY IF EXISTS "Owners read payments" ON public.payments;
CREATE POLICY "Owners read payments" ON public.payments
  FOR SELECT USING (public.is_tenant_owner(tenant_id));

-- ---------------------------------------------- book_appointment consciente de abono
-- Igual que la migración 13 pero el status inicial depende de deposit_enabled del
-- negocio: 'pending' si cobra abono (se confirmará al pagar), 'confirmed' si no.
DROP FUNCTION IF EXISTS public.book_appointment(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, TEXT
);

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_total_price NUMERIC,              -- IGNORADO: el precio es autoritativo del servidor
  p_customer_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
  v_price NUMERIC(10,2);
  v_email TEXT;
  v_deposit BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT COALESCE(ss.custom_price, s.base_price) INTO v_price
  FROM public.services s
  LEFT JOIN public.staff_services ss
    ON ss.service_id = s.id AND ss.staff_id = p_staff_id
  WHERE s.id = p_service_id
    AND s.tenant_id = p_tenant_id
    AND s.is_active = true;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'INVALID_SERVICE: El servicio no existe o no esta activo para este negocio.';
  END IF;

  PERFORM 1 FROM public.staff WHERE id = p_staff_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_STAFF: El profesional no pertenece a este negocio.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE staff_id = p_staff_id
      AND status != 'cancelled'
      AND start_time < p_end_time
      AND end_time > p_start_time
  ) THEN
    RAISE EXCEPTION 'COLLISION: Ese horario ya fue reservado.';
  END IF;

  v_email := NULLIF(btrim(p_customer_email), '');

  -- Si el negocio cobra abono, la cita nace 'pending' (bloquea el slot) hasta el pago.
  SELECT deposit_enabled INTO v_deposit FROM public.tenants WHERE id = p_tenant_id;
  v_status := CASE WHEN COALESCE(v_deposit, false) THEN 'pending' ELSE 'confirmed' END;

  INSERT INTO public.appointments (
    tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
    start_time, end_time, total_price, status
  ) VALUES (
    p_tenant_id, p_staff_id, p_service_id, p_customer_name, p_customer_phone, v_email,
    p_start_time, p_end_time, v_price, v_status
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- --------------------------------------------------- create_deposit_intent (firma)
-- Crea (o reutiliza) el intento de pago del abono y devuelve lo necesario para
-- abrir el widget de Wompi. La firma se calcula aquí con el secreto de integridad
-- del negocio, que jamás sale del backend.
CREATE OR REPLACE FUNCTION public.create_deposit_intent(p_appointment_id UUID)
RETURNS TABLE (
  public_key      TEXT,
  reference       TEXT,
  amount_in_cents BIGINT,
  currency        TEXT,
  signature       TEXT,
  is_sandbox      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a            public.appointments;
  v_percent    INT;
  v_enabled    BOOLEAN;
  v_pubkey     TEXT;
  v_integrity  TEXT;
  v_sandbox    BOOLEAN;
  v_ref        TEXT;
  v_cents      BIGINT;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: La cita no existe.';
  END IF;
  IF a.status <> 'pending' THEN
    RAISE EXCEPTION 'NOT_ACTIONABLE: La cita no está pendiente de pago.';
  END IF;

  SELECT deposit_enabled, deposit_percent INTO v_enabled, v_percent
  FROM public.tenants WHERE id = a.tenant_id;
  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'DEPOSIT_DISABLED: Este negocio no cobra abono.';
  END IF;

  SELECT wompi_public_key, wompi_integrity_secret, is_sandbox
    INTO v_pubkey, v_integrity, v_sandbox
  FROM public.tenant_payment_secrets WHERE tenant_id = a.tenant_id;
  IF v_pubkey IS NULL OR v_integrity IS NULL THEN
    RAISE EXCEPTION 'PAYMENTS_NOT_CONFIGURED: El negocio no ha configurado sus llaves de Wompi.';
  END IF;

  -- Reutiliza un intento PENDING existente (evita duplicados y permite reintentos).
  SELECT p.reference, p.amount_in_cents INTO v_ref, v_cents
  FROM public.payments p
  WHERE p.appointment_id = p_appointment_id AND p.status = 'PENDING'
  ORDER BY p.created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    -- Abono = porcentaje del total, en centavos (COP: pesos * 100).
    v_cents := (round(a.total_price * v_percent / 100.0) * 100)::bigint;
    v_ref := 'BK-' || replace(p_appointment_id::text, '-', '') || '-' || substr(md5(gen_random_uuid()::text), 1, 8);
    INSERT INTO public.payments (tenant_id, appointment_id, reference, amount_in_cents, currency, status, is_sandbox)
    VALUES (a.tenant_id, p_appointment_id, v_ref, v_cents, 'COP', 'PENDING', COALESCE(v_sandbox, true));
  END IF;

  RETURN QUERY SELECT
    v_pubkey,
    v_ref,
    v_cents,
    'COP'::text,
    encode(digest(v_ref || v_cents::text || 'COP' || v_integrity, 'sha256'), 'hex'),
    COALESCE(v_sandbox, true);
END;
$$;

-- ---------------------------------------------- expiración de pendientes (15 min)
-- Un schedule llama esto: cancela las citas 'pending' con más de 15 min sin pago
-- aprobado, liberando el horario, y marca sus intentos PENDING como VOIDED.
CREATE OR REPLACE FUNCTION public.expire_stale_pending_appointments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH stale AS (
    SELECT id FROM public.appointments
    WHERE status = 'pending'
      AND created_at < now() - interval '15 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.appointment_id = appointments.id AND p.status = 'APPROVED'
      )
  ), cancelled AS (
    UPDATE public.appointments SET status = 'cancelled'
    WHERE id IN (SELECT id FROM stale)
    RETURNING id
  ), voided AS (
    -- CTE que modifica datos: se ejecuta siempre, aunque no se referencie.
    UPDATE public.payments SET status = 'VOIDED', updated_at = now()
    WHERE appointment_id IN (SELECT id FROM cancelled) AND status = 'PENDING'
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM cancelled;

  RETURN COALESCE(v_count, 0);
END;
$$;
