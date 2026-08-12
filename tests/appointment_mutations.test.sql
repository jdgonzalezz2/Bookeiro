/*
 * Suite de tests para los RPC de mutacion de citas (Step 19):
 *   public.move_appointment · public.cancel_appointment · public.complete_appointment
 *
 * Cubre autorizacion, estados terminales, identidad, jornada y colision atomica:
 *   M1  move valido: reubica, PRESERVA id y duracion (server-authoritative)
 *   M2  colision: no se puede mover sobre un horario ocupado (no cancelado)
 *   M3  adyacencia permitida: fin==inicio no es colision
 *   M4  move entre profesionales del MISMO negocio
 *   M5  OUTSIDE_HOURS: fuera de la jornada (solo si hay horario configurado)
 *   M6  complete: confirmed -> completed
 *   M7  no se puede mover una cita completada (terminal)
 *   M8  no se puede cancelar una cita completada (terminal)
 *   C1  cancel: confirmed -> cancelled (no se borra)
 *   C2  cancel idempotente: cancelled -> cancelled sin error
 *   C3  no se puede completar una cita cancelada (terminal)
 *   A1  UNAUTHORIZED: un usuario que no es dueno ni staff no puede mutar
 *   N1  NOT_FOUND: id inexistente
 *
 * auth.uid() se simula fijando el claim JWT del owner (estandar Supabase/PostgREST).
 * Autocontenido: siembra, asevera y limpia. Falla -> EXCEPTION 'TESTS FAILED' y la
 * transaccion se revierte (nunca deja datos). Correr:
 *   npx @insforge/cli db query "$(tr '\n' ' ' < tests/appointment_mutations.test.sql)"
 *
 * NOTA concurrencia: dos sesiones simultaneas no se pueden ejecutar en un solo
 * bloque DO. La garantia es el lock FOR UPDATE sobre la fila del profesional (una
 * mutacion serializa a la siguiente) + el chequeo de colision atomico ANTES de
 * escribir; M2 verifica el rechazo de colision, que es el efecto observable.
 */
DO $TEST$
DECLARE
  v_owner    uuid;
  v_stranger uuid;
  v_tenant   uuid;
  v_svc      uuid;
  v_staff1   uuid;
  v_staff2   uuid;
  v_a        uuid;   -- cita bajo prueba
  v_b        uuid;   -- cita bloqueadora
  v_row      public.appointments;
  v_pass     int := 0;
  v_fail     int := 0;
BEGIN
  /* ---- seed ---- */
  INSERT INTO auth.users (email) VALUES ('mut_' || gen_random_uuid() || '@example.com') RETURNING id INTO v_owner;
  INSERT INTO auth.users (email) VALUES ('str_' || gen_random_uuid() || '@example.com') RETURNING id INTO v_stranger;
  INSERT INTO public.tenants (owner_id, name, slug) VALUES (v_owner, 'MutTest', 'muttest-' || substr(md5(random()::text),1,8)) RETURNING id INTO v_tenant;
  INSERT INTO public.services (tenant_id, name, base_price, duration_mins) VALUES (v_tenant, 'Corte', 50000, 60) RETURNING id INTO v_svc;
  INSERT INTO public.staff (tenant_id, name) VALUES (v_tenant, 'Barbero 1') RETURNING id INTO v_staff1;
  INSERT INTO public.staff (tenant_id, name) VALUES (v_tenant, 'Barbero 2') RETURNING id INTO v_staff2;

  -- Autorizacion: actuar como el owner (auth.uid() = v_owner).
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner)::text, true);

  -- A (staff1, 10:00-11:00) y B (staff1, 14:00-15:00), ambas confirmadas.
  v_a := public.book_appointment(v_tenant, v_staff1, v_svc, 'Cliente A', '3001112222', '2027-01-01T10:00:00Z', '2027-01-01T11:00:00Z', 1);
  v_b := public.book_appointment(v_tenant, v_staff1, v_svc, 'Cliente B', '3003334444', '2027-01-01T14:00:00Z', '2027-01-01T15:00:00Z', 1);

  /* ---- M1: move valido, preserva id + duracion (60 min) ---- */
  v_row := public.move_appointment(v_a, v_staff1, '2027-01-01T12:00:00Z');
  IF v_row.id = v_a AND v_row.start_time = '2027-01-01T12:00:00Z' AND v_row.end_time = '2027-01-01T13:00:00Z' AND v_row.status = 'confirmed' THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS M1: move preserva id/duracion';
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M1: %', row_to_json(v_row); END IF;

  /* ---- M2: colision con B (14:00-15:00) ---- */
  BEGIN
    PERFORM public.move_appointment(v_a, v_staff1, '2027-01-01T14:30:00Z');
    v_fail := v_fail + 1; RAISE WARNING 'FAIL M2: esperaba COLLISION';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%COLLISION%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M2: colision bloqueada';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M2: %', SQLERRM; END IF;
  END;

  /* ---- M3: adyacencia (A 15:00-16:00, B termina 15:00) permitida ---- */
  v_row := public.move_appointment(v_a, v_staff1, '2027-01-01T15:00:00Z');
  IF v_row.start_time = '2027-01-01T15:00:00Z' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M3: adyacencia permitida';
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M3'; END IF;

  /* ---- M4: move a otro profesional del mismo negocio ---- */
  v_row := public.move_appointment(v_a, v_staff2, '2027-01-01T09:00:00Z');
  IF v_row.staff_id = v_staff2 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M4: cross-staff mismo negocio';
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M4'; END IF;

  /* ---- M5: OUTSIDE_HOURS (aislado: horario 09:00-18:00 el viernes 2027-01-01) ---- */
  INSERT INTO public.working_hours (tenant_id, staff_id, day_of_week, start_time, end_time)
    VALUES (v_tenant, v_staff2, 5, '09:00:00', '18:00:00');  -- 2027-01-01 es viernes (dow=5)
  BEGIN
    -- 19:00 hora Bogota queda fuera de 09:00-18:00.
    PERFORM public.move_appointment(v_a, v_staff2, '2027-01-01T19:00:00-05:00');
    v_fail := v_fail + 1; RAISE WARNING 'FAIL M5: esperaba OUTSIDE_HOURS';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%OUTSIDE_HOURS%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M5: fuera de jornada bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M5: %', SQLERRM; END IF;
  END;
  DELETE FROM public.working_hours WHERE staff_id = v_staff2;

  /* ---- M6: complete confirmed -> completed ---- */
  v_row := public.complete_appointment(v_a);
  IF v_row.status = 'completed' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M6: completada';
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M6'; END IF;

  /* ---- M7: no se puede mover una completada ---- */
  BEGIN
    PERFORM public.move_appointment(v_a, v_staff2, '2027-01-01T09:00:00Z');
    v_fail := v_fail + 1; RAISE WARNING 'FAIL M7: esperaba NOT_ACTIONABLE';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%NOT_ACTIONABLE%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M7: mover completada bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M7: %', SQLERRM; END IF;
  END;

  /* ---- M8: no se puede cancelar una completada ---- */
  BEGIN
    PERFORM public.cancel_appointment(v_a);
    v_fail := v_fail + 1; RAISE WARNING 'FAIL M8: esperaba NOT_ACTIONABLE';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%NOT_ACTIONABLE%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS M8: cancelar completada bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL M8: %', SQLERRM; END IF;
  END;

  /* ---- C1: cancel confirmed -> cancelled (no se borra) ---- */
  v_row := public.cancel_appointment(v_b);
  IF v_row.status = 'cancelled' AND EXISTS (SELECT 1 FROM public.appointments WHERE id = v_b) THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS C1: cancelada, no borrada';
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL C1'; END IF;

  /* ---- C2: cancel idempotente ---- */
  BEGIN
    v_row := public.cancel_appointment(v_b);
    IF v_row.status = 'cancelled' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS C2: cancel idempotente';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL C2'; END IF;
  EXCEPTION WHEN others THEN v_fail := v_fail + 1; RAISE WARNING 'FAIL C2: no debio lanzar: %', SQLERRM; END;

  /* ---- C3: no se puede completar una cancelada ---- */
  BEGIN
    PERFORM public.complete_appointment(v_b);
    v_fail := v_fail + 1; RAISE WARNING 'FAIL C3: esperaba NOT_ACTIONABLE';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%NOT_ACTIONABLE%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS C3: completar cancelada bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL C3: %', SQLERRM; END IF;
  END;

  /* ---- A1: UNAUTHORIZED (usuario que no es dueno ni staff) ---- */
  PERFORM set_config('request.jwt.claim.sub', v_stranger::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stranger)::text, true);
  BEGIN
    PERFORM public.move_appointment(v_a, v_staff1, '2027-01-01T16:00:00Z');
    v_fail := v_fail + 1; RAISE WARNING 'FAIL A1: esperaba UNAUTHORIZED';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%UNAUTHORIZED%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS A1: no-dueno bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL A1: %', SQLERRM; END IF;
  END;

  /* ---- N1: NOT_FOUND ---- */
  BEGIN
    PERFORM public.cancel_appointment(gen_random_uuid());
    v_fail := v_fail + 1; RAISE WARNING 'FAIL N1: esperaba NOT_FOUND';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%NOT_FOUND%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS N1: id inexistente bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL N1: %', SQLERRM; END IF;
  END;

  /* ---- cleanup (owner cascada a tenant -> services/staff/appointments) ---- */
  DELETE FROM auth.users WHERE id IN (v_owner, v_stranger);

  RAISE NOTICE '=== RESULTADO: % pasaron, % fallaron ===', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'TESTS FAILED: % fallas', v_fail;
  END IF;
END;
$TEST$;
