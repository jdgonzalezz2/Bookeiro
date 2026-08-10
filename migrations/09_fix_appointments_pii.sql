-- Fix: la política "Public read appointments USING(true)" exponía
-- customer_name / customer_phone de TODAS las citas al anon key.
-- Se elimina el read público y se reemplaza por:
--   1. Lectura solo para el staff dueño de la cita (portal del barbero).
--   2. Un RPC SECURITY DEFINER sin PII para calcular disponibilidad pública.
-- (Los dueños siguen cubiertos por "Owners manage appointments" FOR ALL.)

DROP POLICY IF EXISTS "Public read appointments" ON public.appointments;

DROP POLICY IF EXISTS "Staff read own appointments" ON public.appointments;
CREATE POLICY "Staff read own appointments" ON public.appointments FOR SELECT
  USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- Disponibilidad pública sin exponer datos del cliente: solo rangos ocupados.
CREATE OR REPLACE FUNCTION public.get_busy_slots(
  p_staff_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (busy_start TIMESTAMPTZ, busy_end TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.start_time, a.end_time
  FROM public.appointments a
  WHERE a.staff_id = p_staff_id
    AND a.status <> 'cancelled'
    AND a.start_time >= p_from
    AND a.start_time <= p_to;
$$;
