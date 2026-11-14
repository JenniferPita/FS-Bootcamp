# StockFlow integrado — base: proyecto anterior

Esta versión conserva **el sitio público original** (`index.html`, `registro.html`, `login.html`, `precios.html`, estilos CSS y demás páginas), y añade la aplicación funcional React + Supabase en `app/`.

## Cómo ejecutar en Windows (VS Code, PowerShell)

1. Extrae el ZIP.
2. Abre la carpeta `StockFlow_integrado` en VS Code.
3. Abre una terminal en la subcarpeta `app`:
   ```powershell
   cd app
   pnpm install
   ```
4. Crea `app/.env.local` usando `app/.env.example` y copia los valores **públicos** de tu proyecto Supabase (no uses claves secretas ni `service_role`).
5. Ejecuta:
   ```powershell
   pnpm dev
   ```
6. Abre **http://localhost:5173/** para el sitio anterior. Las rutas de registro e ingreso son `/registro.html` y `/login.html`. El panel se encuentra en **http://localhost:5173/app/**.

El proceso de Vite se configura en `app/vite.config.mjs` para publicar **ambas partes en un mismo puerto y origen**. No debes abrir los HTML con `file://` ni ejecutar un servidor distinto para el landing.

## Qué se integró

- Diseño, CSS, contenido y navegación del proyecto anterior, sin reemplazar la página original de registro.
- Registro original conectado a `supabase.auth.signUp()` con `stockflow_registration: true`, nombre de empresa obligatorio, bodega inicial y plan.
- Login original conectado a `supabase.auth.signInWithPassword()` y validación de perfil activo.
- App de React y rutas existentes: Productos (ET-04), Entradas (ET-05), Salidas (ET-06), además de pantallas de pruebas.
- Protección básica de acceso al panel por sesión y perfil activo; botón para cerrar sesión.
- Función de Supabase ET-03 incluida en `supabase/functions/`, **todavía deshabilitada**. No habilitar invitaciones hasta resolver sus pruebas y reconciliación.

## Lo que falta

- ET-02 Suscripciones y ET-03 Usuarios siguen siendo pantallas provisionales.
- Recuperación de contraseñas del sitio original continúa como parte pendiente de integración.
- No se ejecutaron migraciones SQL ni se cambiaron datos de Supabase desde la creación de este archivo.
- Es necesario comprobar visualmente el formulario, los permisos y las rutas en tu entorno conectado a Supabase.
- Las claves `service_role` o `sb_secret_...` **nunca** deben ir en `.env.local` ni en React.

## Compilar

Desde `app/`:
```powershell
pnpm exec tsc -b
pnpm build
```
El contenido conjunto para despliegue se genera en la carpeta raíz `dist/`.

Para Netlify, el archivo raíz `netlify.toml` ya incluye el build conjunto y la reescritura de rutas `/app/*`.

## Nota sobre correo de confirmación

El proyecto original se probó con confirmación de correo deshabilitada. Si tu proyecto de Supabase requiere confirmación, no habrá sesión inmediata después de `signUp`: el nuevo formulario lo explica y **no afirma que la cuenta haya quedado activada**. Verifica la configuración del trigger de registro antes de usarlo con usuarios reales.
