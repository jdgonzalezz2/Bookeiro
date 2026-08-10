# 📋 Pendientes — Configuración post-recuperación

> Tras recuperar el backend en InsForge y desplegar la app, quedaron **3 configuraciones opcionales** que requieren credenciales tuyas. Ninguna rompe la app, pero cada una activa una función específica.

**App en vivo:** https://h4hp9j49.insforge.site
**Proyecto InsForge:** `Bookerio` — `30ab3282-89cc-4da9-b4ab-453fc944667b` (host `h4hp9j49.us-east`)
**Dashboard:** https://insforge.dev/dashboard/project/30ab3282-89cc-4da9-b4ab-453fc944667b

---

## 1. ✉️ Emails de invitación de staff (Resend)

**Qué activa:** el envío real del correo cuando invitas a un profesional/barbero al equipo.
La función serverless `insmessage` ya está desplegada, pero necesita la API key de Resend como secreto.

**Cómo configurarlo:**

1. Crea una cuenta y una API key en https://resend.com (plan gratis sirve para probar).
2. Guarda el secreto en InsForge:
   ```bash
   npx @insforge/cli secrets add RESEND_API_KEY re_tu_key_aqui
   ```

**Nota:** el remitente por defecto en el código es `onboarding@resend.dev` (correo de pruebas de Resend). Para enviar desde tu propio dominio, verifica el dominio en Resend y cambia el `from` en
`frontend/insforge/functions/insmessage/index.ts` (línea ~64), luego redesplegar:
```bash
npx @insforge/cli functions deploy insmessage --file frontend/insforge/functions/insmessage/index.ts
```

---

## 2. 🔑 Login con Google (OAuth)

**Qué activa:** el botón "Continuar con Google" en la página de login.
El login con **email + contraseña ya funciona**; esto es solo para el acceso social.

**Cómo configurarlo:**

1. En Google Cloud Console (https://console.cloud.google.com) crea unas credenciales OAuth 2.0 (tipo "Web application").
2. Agrega como **Authorized redirect URI** la URL de callback de InsForge (la encuentras en el dashboard de InsForge → Authentication → Providers → Google).
3. En el dashboard de InsForge, en **Authentication → Providers → Google**, pega el **Client ID** y **Client Secret**.

Las redirect URLs de la app ya quedaron configuradas en el backend:
- `https://h4hp9j49.insforge.site` y `.../api/auth/callback`
- `http://localhost:3000` y `.../api/auth/callback` (para desarrollo)

---

## 3. 🎨 Generación de logos/portadas con IA (OpenAI DALL·E)

**Qué activa:** los botones de "Generar con IA" en Configuración → Personalizar Sitio
(genera logo y portada del negocio con DALL·E 3).

**Cómo configurarlo:**

1. Consigue una API key en https://platform.openai.com/api-keys
2. Agrégala en **producción** (variable de entorno del deployment):
   ```bash
   npx @insforge/cli deployments env set OPENAI_API_KEY sk-tu-key-aqui
   npx @insforge/cli deployments deploy frontend    # redesplegar para aplicarla
   ```
3. Y para **desarrollo local**, descomenta y completa la línea en `frontend/.env.local`:
   ```
   OPENAI_API_KEY=sk-tu-key-aqui
   ```

---

## ℹ️ Notas generales

- **Los datos viejos se perdieron** (usuarios, reservas, negocios). Se recuperó solo la *estructura* del backend; se arranca con la base limpia.
- **Emails de auth (verificación / reset de contraseña):** hoy usan código OTP y salen por el remitente por defecto de InsForge. Para enviarlos desde tu propio dominio/SMTP, configura `[auth.smtp]` en `insforge.toml` y aplica con `npx @insforge/cli config apply`.
- Cambio de código aplicado en la recuperación: `frontend/lib/auth.ts` ahora **crea el perfil de forma perezosa** (el InsForge nuevo ya no auto-genera la tabla `profiles`).
