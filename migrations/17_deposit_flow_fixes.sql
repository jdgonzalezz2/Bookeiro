-- P1.1 (QA fixes de la revisión de código) — dos correcciones al flujo de abono.
--
-- ⚠️ APLICAR por `db migrations up` (funciones con cuerpo $$). Ver migración 13.
--
-- FIX 1 (crítico): book_appointment forzaba 'pending' para TODA reserva cuando el
--   negocio tenía abono configurado — incluidas las que crea el DUEÑO/STAFF desde
--   el dashboard (walk-ins), que nunca pagan online. El barrido de expiración
--   (15 min) las cancelaba y desaparecían. Ahora solo las reservas PÚBLICAS
--   (anónimas, auth.uid() IS NULL) nacen 'pending'; las autenticadas (dashboard)
--   siempre 'confirmed'.
--
-- FIX 2 (serio): si el pago se aprueba DESPUÉS de que la cita expiró (carrera con
--   el barrido de 15 min), el webhook necesita marcar el pago para reembolso si el
--   cupo ya no está libre. Se agrega payments.needs_refund para esa señal.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS needs_refund BOOLEAN NOT NULL DEFAULT false;

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

  -- 'pending' SOLO para reservas PÚBLICAS (anónimas) cuando el abono está activo y
  -- configurado. Las reservas autenticadas (dueño/staff desde el dashboard) nunca
  -- pasan por pago online, así que siempre 'confirmed'.
  SELECT COALESCE(t.deposit_enabled, false)
           AND ps.wompi_public_key IS NOT NULL
           AND ps.wompi_integrity_secret IS NOT NULL
           AND auth.uid() IS NULL
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
