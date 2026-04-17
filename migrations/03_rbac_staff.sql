ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invite_email TEXT;

-- Let authenticated staff members see their own row
CREATE POLICY "Staff can view own row" ON public.staff FOR SELECT USING (
  user_id = auth.uid() OR auth.uid() IN (SELECT owner_id FROM public.tenants WHERE id = tenant_id)
);
-- Note: InsForge by default might already have a permissive SELECT or tenant based SELECT. 
