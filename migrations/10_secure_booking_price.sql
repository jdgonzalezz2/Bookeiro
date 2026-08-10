-- Fix: book_appointment confiaba en el p_total_price enviado por el cliente,
-- permitiendo reservar a cualquier precio (p. ej. $0).
-- Ahora el precio se calcula server-side desde services / staff_services y se
-- valida que el servicio y el profesional pertenezcan al negocio.
-- El parámetro p_total_price se mantiene por compatibilidad de firma pero se IGNORA.

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_total_price NUMERIC  -- IGNORADO: el precio es autoritativo del servidor
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
  v_price NUMERIC(10,2);
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

  INSERT INTO public.appointments (
    tenant_id, staff_id, service_id, customer_name, customer_phone, start_time, end_time, total_price, status
  ) VALUES (
    p_tenant_id, p_staff_id, p_service_id, p_customer_name, p_customer_phone, p_start_time, p_end_time, v_price, 'confirmed'
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;
