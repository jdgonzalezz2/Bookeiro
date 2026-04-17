CREATE OR REPLACE FUNCTION accept_staff_invite(user_uuid UUID, user_email TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_staff_id UUID;
  target_tenant_id UUID;
BEGIN
  -- Find the invite
  SELECT id, tenant_id INTO target_staff_id, target_tenant_id
  FROM public.staff 
  WHERE invite_email = user_email AND user_id IS NULL 
  LIMIT 1;

  IF target_staff_id IS NOT NULL THEN
    -- Link staff
    UPDATE public.staff SET user_id = user_uuid WHERE id = target_staff_id;
    -- Link profile
    UPDATE public.profiles SET tenant_id = target_tenant_id, role = 'staff' WHERE id = user_uuid;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
