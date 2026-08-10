-- Fix: la política users_update_own_profile permitía al usuario cambiar
-- CUALQUIER columna de su fila, incluidos role y tenant_id -> un 'barber'
-- podia auto-promoverse a 'owner' o saltar a otro negocio.
--
-- Solución: trigger BEFORE UPDATE en SECURITY INVOKER que congela role y
-- tenant_id cuando el actor es un rol de cliente (authenticated / anon).
-- Los RPCs SECURITY DEFINER corren como 'project_admin' (su dueño) y por eso
-- pasan libres, permitiendo que accept_staff_invite siga asignando el rol.
-- La primera asignación de tenant_id (NULL -> valor) del onboarding se permite.
--
-- Nota: se evita set_config / SET ROLE porque el backend de InsForge los bloquea;
-- la discriminación se hace por current_user (rol efectivo del actor).

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Roles privilegiados del servidor (los RPCs SECURITY DEFINER corren como
  -- project_admin) pueden cambiar todo.
  IF current_user IN ('project_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Cliente (authenticated / anon): el rol queda congelado.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No autorizado a cambiar el rol del perfil.';
  END IF;

  -- tenant_id: se permite la asignacion inicial (NULL -> valor) del onboarding,
  -- pero no re-apuntar a otro negocio ni desvincularlo despues.
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'No autorizado a cambiar el negocio del perfil.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();
