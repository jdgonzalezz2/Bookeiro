-- P1.1 (QA) — Robustez del abono: no romper reservas si el negocio activó el
-- abono pero NO terminó de configurar sus llaves de Wompi.
--
-- ⚠️ APLICAR por `db migrations up` (funciones con cuerpo $$). Ver migración 13.
--
-- Antes: book_appointment creaba 'pending' con solo deposit_enabled=true. Si el
-- negocio no tenía llaves, la cita quedaba 'pending' sin poder pagarse y expiraba
-- => el cliente no podía reservar. Ahora la cita solo nace 'pending' cuando el
-- pago está REALMENTE configurado (deposit_enabled + llave pública + secreto de
-- integridad). Si no, se comporta como sin abono (nace 'confirmed').
--
-- Además: deposit_status(tenant) — RPC público (SECURITY DEFINER) que dice si el
-- abono está activo y su porcentaje, SIN exponer los secretos. La vitrina lo usa
-- para mostrar el paso de pago solo cuando corresponde.

CREATE OR REPLACE FUNCTION public.deposit_status(p_tenant_id UUID)
RETURNS TABLE (active BOOLEAN, percent INT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.deposit_enabled, false)
      AND s.wompi_public_key IS NOT NULL
      AND s.wompi_integrity_secret IS NOT NULL,
    COALESCE(t.deposit_percent, 50)
  FROM public.tenants t
  LEFT JOIN public.tenant_payment_secrets s ON s.tenant_id = t.id
  WHERE t.id = p_tenant_id;
$$;

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

  -- 'pending' SOLO si el abono está activo Y configurado (llave pública + secreto
  -- de integridad presentes). Si no, la reserva se confirma como siempre.
  SELECT COALESCE(t.deposit_enabled, false)
           AND ps.wompi_public_key IS NOT NULL
           AND ps.wompi_integrity_secret IS NOT NULL
    INTO v_deposit
  FROM public.tenants t
  LEFT JOIN public.tenant_payment_secrets ps ON ps.tenant_id = t.id
  WHERE t.id = p_tenant_id;

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
