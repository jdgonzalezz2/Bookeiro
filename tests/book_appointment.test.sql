/*
 * Suite de tests para el RPC public.book_appointment.
 *
 * Cubre las propiedades de seguridad de la reserva:
 *   T1  el precio sale del servidor (base_price), ignora el precio del cliente
 *   T2  el override por barbero (staff_services.custom_price) tiene prioridad
 *   T3  colision: no se puede reservar un horario que se solapa
 *   T4  no se puede reservar un profesional de OTRO negocio (cross-tenant)
 *   T5  no se puede reservar un servicio inexistente
 *
 * Es autocontenido: siembra sus datos, corre las aserciones y limpia todo.
 * Si algo falla lanza EXCEPTION 'TESTS FAILED' (y toda la transaccion se revierte,
 * asi que nunca deja datos de prueba). Si pasa, limpia explicitamente.
 *
 * Correr:
 *   npx @insforge/cli db query "$(tr '\n' ' ' < tests/book_appointment.test.sql)"
 * (se aplana a una linea porque `db query` corta el SQL en el primer salto de
 *  linea; por eso los comentarios son de bloque, para sobrevivir el aplanado.)
 */
DO $TEST$
DECLARE
  v_owner  uuid;
  v_t1     uuid;
  v_t2     uuid;
  v_svcA   uuid;
  v_svcB   uuid;
  v_staff1 uuid;
  v_staff2 uuid;
  v_appt   uuid;
  v_price  numeric;
  v_pass   int := 0;
  v_fail   int := 0;
BEGIN
  /* ---- seed ---- */
  INSERT INTO auth.users (email) VALUES ('rpctest_' || gen_random_uuid() || '@example.com') RETURNING id INTO v_owner;
  INSERT INTO public.tenants (owner_id, name, slug) VALUES (v_owner, 'RPCTest T1', 'rpctest-t1-' || substr(md5(random()::text),1,8)) RETURNING id INTO v_t1;
  INSERT INTO public.tenants (owner_id, name, slug) VALUES (v_owner, 'RPCTest T2', 'rpctest-t2-' || substr(md5(random()::text),1,8)) RETURNING id INTO v_t2;
  INSERT INTO public.services (tenant_id, name, base_price, duration_mins) VALUES (v_t1, 'Corte', 50000, 30) RETURNING id INTO v_svcA;
  INSERT INTO public.services (tenant_id, name, base_price, duration_mins) VALUES (v_t1, 'Barba', 30000, 30) RETURNING id INTO v_svcB;
  INSERT INTO public.staff (tenant_id, name) VALUES (v_t1, 'Barbero 1') RETURNING id INTO v_staff1;
  INSERT INTO public.staff (tenant_id, name) VALUES (v_t2, 'Barbero 2 (otro negocio)') RETURNING id INTO v_staff2;
  INSERT INTO public.staff_services (staff_id, service_id, custom_price) VALUES (v_staff1, v_svcB, 70000);

  /* ---- T1: precio base del servidor, ignora el precio del cliente (envia 1) ---- */
  v_appt := public.book_appointment(v_t1, v_staff1, v_svcA, 'Cliente', '3001112222', '2027-01-01T10:00:00Z', '2027-01-01T10:30:00Z', 1);
  SELECT total_price INTO v_price FROM public.appointments WHERE id = v_appt;
  IF v_price = 50000 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS T1: precio base server-side = %', v_price;
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL T1: esperaba 50000, obtuvo %', v_price; END IF;

  /* ---- T2: override por barbero (custom_price) gana ---- */
  v_appt := public.book_appointment(v_t1, v_staff1, v_svcB, 'Cliente', '3001112222', '2027-01-01T11:00:00Z', '2027-01-01T11:30:00Z', 1);
  SELECT total_price INTO v_price FROM public.appointments WHERE id = v_appt;
  IF v_price = 70000 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS T2: override de barbero = %', v_price;
  ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL T2: esperaba 70000, obtuvo %', v_price; END IF;

  /* ---- T3: colision con horario solapado ---- */
  BEGIN
    PERFORM public.book_appointment(v_t1, v_staff1, v_svcA, 'Otro', '3009998888', '2027-01-01T10:15:00Z', '2027-01-01T10:45:00Z', 1);
    v_fail := v_fail + 1; RAISE WARNING 'FAIL T3: esperaba COLLISION, no se lanzo';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%COLLISION%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS T3: colision bloqueada';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL T3: error inesperado: %', SQLERRM; END IF;
  END;

  /* ---- T4: profesional de otro negocio ---- */
  BEGIN
    PERFORM public.book_appointment(v_t1, v_staff2, v_svcA, 'Otro', '3009998888', '2027-02-01T10:00:00Z', '2027-02-01T10:30:00Z', 1);
    v_fail := v_fail + 1; RAISE WARNING 'FAIL T4: esperaba INVALID_STAFF, no se lanzo';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%INVALID_STAFF%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS T4: cross-tenant bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL T4: error inesperado: %', SQLERRM; END IF;
  END;

  /* ---- T5: servicio inexistente ---- */
  BEGIN
    PERFORM public.book_appointment(v_t1, v_staff1, gen_random_uuid(), 'Otro', '3009998888', '2027-03-01T10:00:00Z', '2027-03-01T10:30:00Z', 1);
    v_fail := v_fail + 1; RAISE WARNING 'FAIL T5: esperaba INVALID_SERVICE, no se lanzo';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%INVALID_SERVICE%' THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS T5: servicio invalido bloqueado';
    ELSE v_fail := v_fail + 1; RAISE WARNING 'FAIL T5: error inesperado: %', SQLERRM; END IF;
  END;

  /* ---- cleanup (borrar al owner cascada a tenants -> services/staff/appointments) ---- */
  DELETE FROM auth.users WHERE id = v_owner;

  RAISE NOTICE '=== RESULTADO: % pasaron, % fallaron ===', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'TESTS FAILED: % fallas', v_fail;
  END IF;
END;
$TEST$;
