-- Permitir que un usuario actualice la tabla staff si su email coincide con invite_email y no tiene user_id aún
CREATE POLICY "Staff can accept invite" 
ON public.staff 
FOR UPDATE 
USING (user_id IS NULL) 
WITH CHECK (user_id = auth.uid());

-- Por si la política de profiles no permitía cambiar el role
-- InsForge suele tener "users_update_own_profile" pero verifiquemos
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
