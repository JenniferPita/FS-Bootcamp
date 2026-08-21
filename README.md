# StockFlow

Sitio estático de marketing para StockFlow (control de inventario), compuesto por 5 páginas — `index.html`, `precios.html`, `registro.html`, `login.html`, `recuperar-password.html` — con estilos modularizados en CSS y formularios validados en TypeScript.

## Estructura del proyecto

```
index.html                   Página de inicio
precios.html                  Planes y precios
registro.html                  Registro / prueba gratis
login.html                     Iniciar sesión
recuperar-password.html        Recuperar contraseña

css/
  styles.css                   Punto de entrada: solo @import, en orden obligatorio
  variables.css                 Design tokens (colores, --space-*, --font-*)
  base.css                      Reset + estilos globales + accesibilidad
  layout.css                    Primitivos reutilizados (container, section, eyebrow...)
  components.css                 Todas las secciones visuales (header, hero, precios, forms, footer...)
  responsive.css                 Media queries min-width (621px/901px) — se importa último

ts/                            Código fuente TypeScript
  nav.ts                         Menú de navegación (drawer móvil)
  theme.ts                       Selector de tema claro/oscuro
  contact-form.ts                Validación del formulario de contacto (index.html)
  registro-form.ts               Validación del formulario de registro
  login-form.ts                  Validación del formulario de login
  recuperar-password-form.ts     Validación del formulario de recuperar contraseña

js/                           Salida compilada de ts/ (no editar a mano)

images/
  og-image.svg                  Imagen usada en Open Graph / Twitter Card

robots.txt, sitemap.xml       SEO técnico

CLAUDE.md                     Guía de arquitectura para Claude Code
PLAN.md                       Roadmap de producto en curso
```

## Requisitos

- [Node.js](https://nodejs.org/) (incluye `npx`)

## Uso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Compilar TypeScript

El código fuente vive en `ts/` y se compila a `js/` (configurado en `tsconfig.json`):

```bash
npm run build
```

Vuelve a ejecutar este comando cada vez que modifiques un archivo en `ts/`.

### 3. Servir el sitio

Es un sitio estático, así que cualquier servidor HTTP sirve. Con Node ya instalado, la forma más simple:

```bash
npx serve .
```

Luego abre la URL que muestre en terminal (por defecto algo como `http://localhost:3000`).

## Notas

- El CSS está modularizado pero cada HTML sigue enlazando solo `css/styles.css` — ese archivo no tiene reglas propias, solo `@import` en un orden que **no se puede alterar** (`responsive.css` siempre al final; ver el comentario dentro de ese archivo). Los estilos usan variables CSS (`--color-*`, `--space-*`, `--font-*`) definidas en `css/variables.css` — modifica esos tokens para cambiar el diseño de forma centralizada.
- Ninguno de los 4 formularios (contacto, registro, login, recuperar contraseña) tiene backend real: todos usan `action="#"` y solo hacen validación del lado del cliente.
- El tema claro/oscuro se guarda en `localStorage` y se aplica antes de pintar la página (script inline en el `<head>` de cada HTML).
- `robots.txt` y `sitemap.xml` usan el dominio placeholder `example.com`; actualízalo al desplegar con un dominio real.
- `images/og-image.svg` es una imagen de marca simple para redes sociales; para máxima compatibilidad con Facebook/Twitter conviene exportarla a PNG/JPG (1200×630).
- `PLAN.md` documenta qué falta del flujo de producto (Términos/Privacidad reales, prueba social real, de-duplicar contenido entre `index.html` y `precios.html`).
