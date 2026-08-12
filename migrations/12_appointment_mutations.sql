-- Step 19 — Server-authoritative appointment mutations (MOVE / CANCEL / COMPLETE).
--
-- CREATE already has a canonical write path (public.book_appointment, migration 10)
-- and is NOT duplicated here. These three RPCs complete the scheduling surface.
--
-- Design (mirrors book_appointment):
--   * SECURITY DEFINER + SET search_path = public.
--   * Atomicity/concurrency: the target staff row is locked FOR UPDATE, so all
--     bookings/moves for one professional serialize — the collision check and the
--     write happen without a race window (no SELECT-check-in-JS-then-INSERT).
--   * The final collision check is the AUTHORITY. rail-core's isFree/Calm
--     Correction on the client is UX only.
--
-- DIFFERENCE from book_appointment: these operate on an EXISTING appointment by id,
-- so they MUST authorize the caller. Unlike public booking, they are NOT open:
--   authorized = owner of the appointment's tenant  OR  the assigned staff member.
-- Authorization uses auth.uid() (never a client-passed tenant/permission).
--
-- Errors use the same PREFIX convention the client maps to friendly messages:
--   NOT_FOUND · UNAUTHORIZED · NOT_ACTIONABLE · INVALID_STAFF · OUTSIDE_HOURS · COLLISION
--
-- Each returns the AUTHORITATIVE appointments row so the client reconciles state
-- from the database, never guesses it.

-- --------------------------------------------------------------------------
-- Shared authorization predicate: may the current user manage this appointment?
-- SECURITY DEFINER so it can read tenants/staff regardless of the caller's RLS.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_appointment(a public.appointments)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_tenant_owner(a.tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.staff st
      WHERE st.id = a.staff_id AND st.user_id = auth.uid()
    );
$$;

-- --------------------------------------------------------------------------
-- MOVE — relocate an existing appointment in time and/or to another professional.
-- Preserves identity (same row/id/service/price/customer/status); duration is
-- taken from the existing row (server-authoritative), NOT the client.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.move_appointment(
  p_appointment_id UUID,
  p_staff_id       UUID,
  p_start_time     TIMESTAMPTZ
) RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a          public.appointments;
  v_duration INTERVAL;
  v_end      TIMESTAMPTZ;
  v_dow      INT;
  v_local_s  TIME;
  v_local_e  TIME;
BEGIN
  -- Lock the appointment first (state guard + serialize concurrent edits of it).
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: La cita no existe.';
  END IF;

  IF NOT public.can_manage_appointment(a) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: No tienes permiso para modificar esta cita.';
  END IF;

  IF a.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'NOT_ACTIONABLE: No puedes mover una cita %.', a.status;
  END IF;

  -- Target professional must belong to the SAME business; lock to serialize the
  -- collision check against concurrent bookings/moves for that professional.
  PERFORM 1 FROM public.staff
    WHERE id = p_staff_id AND tenant_id = a.tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_STAFF: El profesional no pertenece a este negocio.';
  END IF;

  -- Duration is intrinsic to the appointment; the client cannot stretch it.
  v_duration := a.end_time - a.start_time;
  v_end := p_start_time + v_duration;

  -- Working-hours guard (best-effort mirror of rail-core's window rule). Enforced
  -- ONLY when the professional has active hours configured for that weekday, so
  -- tenants without configured hours behave like book_appointment (no enforcement).
  -- Bogotá is fixed UTC-5; appointments never cross midnight, so a time compare is safe.
  v_dow     := EXTRACT(DOW FROM (p_start_time AT TIME ZONE 'America/Bogota'))::int;
  v_local_s := (p_start_time AT TIME ZONE 'America/Bogota')::time;
  v_local_e := (v_end        AT TIME ZONE 'America/Bogota')::time;
  IF EXISTS (
    SELECT 1 FROM public.working_hours w
    WHERE w.staff_id = p_staff_id AND w.day_of_week = v_dow AND w.is_active
  ) AND NOT EXISTS (
    SELECT 1 FROM public.working_hours w
    WHERE w.staff_id = p_staff_id AND w.day_of_week = v_dow AND w.is_active
      AND w.start_time <= v_local_s AND w.end_time >= v_local_e
  ) THEN
    RAISE EXCEPTION 'OUTSIDE_HOURS: El horario esta fuera de la jornada del profesional.';
  END IF;

  -- Final authoritative collision check: overlap with any non-cancelled appt of
  -- the target professional, EXCLUDING the appointment being moved.
  IF EXISTS (
    SELECT 1 FROM public.appointments o
    WHERE o.staff_id = p_staff_id
      AND o.id <> p_appointment_id
      AND o.status <> 'cancelled'
      AND o.start_time < v_end
      AND o.end_time   > p_start_time
  ) THEN
    RAISE EXCEPTION 'COLLISION: Ese horario acaba de ocuparse.';
  END IF;

  UPDATE public.appointments
    SET staff_id = p_staff_id, start_time = p_start_time, end_time = v_end
    WHERE id = p_appointment_id
    RETURNING * INTO a;

  RETURN a;
END;
$$;

-- --------------------------------------------------------------------------
-- CANCEL — terminal. Never deletes. Idempotent if already cancelled; a completed
-- appointment cannot be cancelled.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_appointment(p_appointment_id UUID)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.appointments;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: La cita no existe.';
  END IF;

  IF NOT public.can_manage_appointment(a) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: No tienes permiso para modificar esta cita.';
  END IF;

  IF a.status = 'completed' THEN
    RAISE EXCEPTION 'NOT_ACTIONABLE: No puedes cancelar una cita completada.';
  END IF;

  IF a.status = 'cancelled' THEN
    RETURN a; -- idempotent no-op
  END IF;

  UPDATE public.appointments
    SET status = 'cancelled'
    WHERE id = p_appointment_id
    RETURNING * INTO a;

  RETURN a;
END;
$$;

-- --------------------------------------------------------------------------
-- COMPLETE — terminal. Idempotent if already completed; a cancelled appointment
-- cannot be completed.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id UUID)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.appointments;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: La cita no existe.';
  END IF;

  IF NOT public.can_manage_appointment(a) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: No tienes permiso para modificar esta cita.';
  END IF;

  IF a.status = 'cancelled' THEN
    RAISE EXCEPTION 'NOT_ACTIONABLE: No puedes completar una cita cancelada.';
  END IF;

  IF a.status = 'completed' THEN
    RETURN a; -- idempotent no-op
  END IF;

  UPDATE public.appointments
    SET status = 'completed'
    WHERE id = p_appointment_id
    RETURNING * INTO a;

  RETURN a;
END;
$$;
