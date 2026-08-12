-- P1.1 (Fase C1) — Configuración de pagos Wompi por negocio (modelo de cuenta
-- conectada: cada negocio cobra en SU propia cuenta; Bookeiro nunca toca el dinero).
--
-- ⚠️ APLICAR por el workflow de migraciones (`db migrations up <ts>_...sql`), NO
--    por `db query` (parte por `;` y solo corre una sentencia). Ver migración 13.
--
-- SEGURIDAD: `public.tenants` tiene "Public read tenants" USING(true) => lectura
-- pública. Por eso los SECRETOS de Wompi NO van en tenants (se filtrarían al anon
-- key). Van en `tenant_payment_secrets` con RLS solo-dueño. En tenants solo quedan
-- los flags no sensibles que la vitrina necesita para saber si pedir abono.

-- 1) Flags de abono en tenants (no sensibles; lectura pública OK).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deposit_percent INT NOT NULL DEFAULT 50
    CHECK (deposit_percent BETWEEN 1 AND 100);

-- 2) Secretos de Wompi por negocio — SOLO el dueño puede leer/escribir.
--    (La llave pública es de por sí exponible, pero se guarda aquí junto a los
--    secretos; el servidor la devuelve al iniciar el cobro. Los secretos jamás
--    salen del backend.)
CREATE TABLE IF NOT EXISTS public.tenant_payment_secrets (
  tenant_id             UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  wompi_public_key      TEXT,
  wompi_integrity_secret TEXT,
  wompi_events_secret   TEXT,
  is_sandbox            BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_payment_secrets ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del negocio gestiona sus llaves. SIN política pública => el anon
-- key no puede leer estos secretos. Los RPCs SECURITY DEFINER (C2/C3) y el webhook
-- (admin client) sí acceden de forma controlada.
DROP POLICY IF EXISTS "Owners manage payment secrets" ON public.tenant_payment_secrets;
CREATE POLICY "Owners manage payment secrets" ON public.tenant_payment_secrets
  FOR ALL USING (public.is_tenant_owner(tenant_id))
  WITH CHECK (public.is_tenant_owner(tenant_id));
