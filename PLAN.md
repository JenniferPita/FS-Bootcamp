# Plan — Completar el flujo de producto de StockFlow

## Contexto

StockFlow es una landing SaaS de 3 páginas (`index.html`, `precios.html`, `registro.html`) que promete cosas que hoy no existen: un login al que `registro.html` remite ("Inicia sesión") pero que no tiene destino, un checkbox de Términos/Privacidad que enlaza a `href="#"`, un footer que enlaza "Nosotros" al Hero en vez de a contenido real, y una sección de "clientes" con logos inventados presentados como si fueran reales. El objetivo de este plan es cerrar esas brechas para que el sitio, aunque siga siendo solo frontend (sin backend), cuente una historia de producto coherente y honesta de principio a fin.

**Decisiones ya tomadas con el usuario:**
- Alcance: solo frontend, sin backend/auth real — los formularios nuevos siguen el mismo patrón que `registro.html`/`contacto` (validación TS client-side, `action="#"`).
- Prioridad: las 4 áreas (cuenta, confianza, legal, consistencia) — por eso el plan está dividido en fases ejecutables por separado.
- Prueba social: aún no hay clientes reales → se retiran los logos inventados y se documenta una estrategia para conseguir testimonios reales más adelante.
- Login/recuperar contraseña: sí, como páginas de interfaz sin backend.

## Fase 1 — Flujo de cuenta (UI)

**Nuevas páginas** (mismo esqueleto que `registro.html`: header, `<main>`, footer, script de tema inline en `<head>`):
- `login.html` — campos email + password, checkbox "Recordarme" opcional, botón submit, enlace a `recuperar-password.html` y a `registro.html` ("¿No tienes cuenta? Regístrate gratis"). Validación: campos requeridos + formato de email (reutiliza el patrón de `ts/registro-form.ts`).
- `recuperar-password.html` — un solo campo de email, mensaje de éxito neutro tipo "Si el correo existe en nuestro sistema, te enviaremos instrucciones" (no confirmar/negar si el email está registrado), enlace de vuelta a `login.html`.

**Nuevo TS** (siguiendo el patrón ya usado en `ts/contact-form.ts` y `ts/registro-form.ts` — mismo esquema de `aria-describedby` + `.form-error` + `role="alert"`):
- `ts/login-form.ts` → compila a `js/login-form.js`
- `ts/recuperar-password-form.ts` → compila a `js/recuperar-password-form.js`

⚠️ **Recordatorio de una lección de esta misma sesión**: estos archivos se compilan como scripts clásicos (no módulos), así que comparten el scope global de TypeScript con `contact-form.ts`/`registro-form.ts`. Hay que prefijar los identificadores compartidos (`EMAIL_PATTERN`, nombres de interfaces, funciones `validate*`) para no repetir el error de compilación por colisión de nombres que ya ocurrió al crear `registro-form.ts`.

**Cambios en páginas existentes:**
- `registro.html:281` — el enlace roto "Inicia sesión" → `login.html`.
- Header de las 6 páginas (3 actuales + 3 nuevas de este plan) — agregar enlace secundario "Iniciar sesión" junto al botón "Prueba gratis".

**Decisión de alcance tomada con el usuario:** no se crea una página "correo verificado" independiente, porque nadie puede llegar a ella sin un backend que genere el enlace. En su lugar, se refuerza el mensaje de éxito que ya existe en `registro.html` ("¡Cuenta creada! Revisa tu correo para confirmarla.") para que quede como el punto final realista de este flujo sin backend.

## Fase 2 — Legal y cumplimiento

**Nuevas páginas:**
- `terminos.html` — Términos de servicio (uso del servicio, cuentas, cancelación, propiedad intelectual, límite de responsabilidad, ley aplicable, contacto).
- `privacidad.html` — Política de privacidad (qué datos se recopilan en los formularios existentes — nombre, empresa, email, contraseña —, uso de `localStorage` para el tema, derechos de acceso/eliminación, contacto). Incluye una subsección "Seguridad de los datos" (backups, cifrado en tránsito/reposo) en vez de una página aparte, para no multiplicar páginas legales de bajo tráfico.

Ambas páginas llevan un comentario HTML visible marcándolas como contenido de plantilla a revisar por asesoría legal real antes de cualquier lanzamiento en producción.

**Cambios en páginas existentes** (reemplazar cada `href="#"` señalado abajo por el destino real):
- `registro.html:264-265` — checkbox de consentimiento → `terminos.html` y `privacidad.html`.
- Footer de `index.html:949,955`, `precios.html:466,472`, `registro.html:440,446` — enlaces "Privacidad"/"Términos" → páginas reales.
- `sitemap.xml` — agregar las páginas nuevas de esta fase (y de la Fase 1).

## Fase 3 — Confianza y prueba social

- **Quitar los logos de "clientes" inventados** (`index.html`, sección `.clients-banner`). En su lugar, cambiar el encabezado de la sección a algo honesto y no atribuido a marcas específicas (ej. "Pensado para negocios de retail, distribución y e-commerce" con etiquetas de industria genéricas en vez de nombres de empresa inventados), conservando el carrusel CSS existente si el efecto visual aporta.
- **Reescribir la sección "Resultados"** (`index.html` y `precios.html`) de afirmación de hechos pasados ("32% más eficiencia... 40% menos errores...") a lenguaje de objetivo/proyección, ya que hoy no hay clientes reales que respalden esas cifras (ej. "Nuestro objetivo: hasta 32% más eficiencia operativa"). Es la misma corrección honesta que con los logos, aplicada a las estadísticas.
- **Nueva sección "Nosotros" real en `index.html`**, moviendo `id="nosotros"` del Hero (`index.html:126`) a esta nueva sección con contenido real (misión, por qué existe StockFlow). Esto corrige el enlace del footer que hoy aterriza en el sitio equivocado.
- **Nota de estrategia** (documentada en el plan, no requiere código): para reemplazar los logos/resultados por prueba social real, la vía más rápida suele ser reclutar 3-5 negocios piloto (beta gratuita a cambio de una cita/testimonio breve) antes del lanzamiento — cuando existan, se agregan como una sección de testimonios con nombre, negocio y cita corta.

## Fase 4 — Consistencia de contenido

- **Eliminar la duplicación literal de precios y resultados** entre `index.html` y `precios.html`: la home pasa a mostrar una versión resumida de precios (los 3 montos + un botón "Ver todos los planes y funcionalidades" hacia `precios.html`) en vez de repetir las 3 tarjetas completas; la sección "Resultados" completa vive solo en `index.html`, y `precios.html` la reemplaza por una franja de una sola línea o la retira.
- **Tabla comparativa de funcionalidades** en `precios.html`, debajo de las tarjetas, con filas de funcionalidades y columnas Inicial/Profesional/Empresa (check/cruz) — usa los mismos datos que ya están en las listas de cada tarjeta, solo en formato más escaneable.
- **CTA del plan Empresa** — cambiar "Contactar" para que quede claro que es una consulta de ventas (ej. `mailto:` con asunto prellenado "Consulta plan Empresa", o texto de botón "Hablar con ventas").

## Verificación

Como es un sitio estático sin backend, la verificación es manual:
1. `npx tsc` sin errores tras agregar los nuevos `.ts`.
2. Servir el sitio (`npx serve .`) y revisar a mano cada enlace que hoy es `href="#"` (los listados arriba) para confirmar que ya apunta a una página real.
3. Probar los 4 formularios (contacto, registro, login, recuperar contraseña) con: campo vacío, formato de email inválido, y datos válidos — confirmar mensaje de error accesible (`role="alert"`) y mensaje de éxito.
4. Revisar en móvil y escritorio que las páginas nuevas respeten el mismo patrón mobile-first y los design tokens de `css/styles.css` (sin agregar valores nuevos sueltos si ya existe un token equivalente).
5. Confirmar que `sitemap.xml` lista todas las páginas nuevas.
