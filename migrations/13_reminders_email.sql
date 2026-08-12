-- P1.2 — Recordatorios por email (v1).
--
-- 1) Captura un email OPCIONAL del cliente en la cita (hoy la vitrina solo pedía
--    nombre + teléfono).
-- 2) Lleva control de qué recordatorios ya se enviaron (24h / 2h) para que el
--    motor de envíos sea idempotente y nunca duplique.
-- 3) Extiende book_appointment para aceptar el email, SIN cambiar nada de la
--    seguridad de la migración 10 (precio autoritativo del servidor, validación
--    de servicio/profesional, colisión atómica con FOR UPDATE).
--
-- Retrocompatibilidad: el nuevo parámetro p_customer_email es el ÚLTIMO y tiene
-- DEFAULT NULL, así que los llamados existentes con 8 argumentos siguen
-- funcionando (usan el default). Se hace DROP del overload de 8 args + CREATE del
-- de 9 args para que exista UNA sola función (sin ambigüedad de sobrecarga).

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent_2h  BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.book_appointment(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC
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
BEGIN
  -- Precio autoritativo: override por barbero si existe, si no el precio base.
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

  -- El profesional debe pertenecer al negocio; bloquea su fila para evitar carreras.
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

  -- Normaliza email vacío a NULL (se acepta reservar sin email).
  v_email := NULLIF(btrim(p_customer_email), '');

  INSERT INTO public.appointments (
    tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
    start_time, end_time, total_price, status
  ) VALUES (
    p_tenant_id, p_staff_id, p_service_id, p_customer_name, p_customer_phone, v_email,
    p_start_time, p_end_time, v_price, 'confirmed'
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;
