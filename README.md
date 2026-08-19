# StockFlow

Sitio estático de marketing para StockFlow (control de inventario), compuesto por 3 páginas — `index.html`, `precios.html`, `registro.html` — con estilos centralizados en CSS y formularios validados en TypeScript.

## Estructura del proyecto

```
index.html          Página de inicio
precios.html         Planes y precios
registro.html         Formulario de registro / prueba gratis

css/
  styles.css          Estilos (mobile-first, con design tokens en :root)

ts/                   Código fuente TypeScript
  nav.ts               Menú de navegación (drawer móvil)
  theme.ts             Selector de tema claro/oscuro
  contact-form.ts       Validación del formulario de contacto (index.html)
  registro-form.ts      Validación del formulario de registro (registro.html)

js/                   Salida compilada de ts/ (no editar a mano)

images/
  og-image.svg          Imagen usada en Open Graph / Twitter Card

robots.txt, sitemap.xml   SEO técnico
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

- Los estilos usan variables CSS (`--color-*`, `--space-*`, `--font-*`) definidas en `:root` de `css/styles.css` — modifica esos tokens para cambiar el diseño de forma centralizada.
- El tema claro/oscuro se guarda en `localStorage` y se aplica antes de pintar la página (script inline en el `<head>` de cada HTML).
- `robots.txt` y `sitemap.xml` usan el dominio placeholder `example.com`; actualízalo al desplegar con un dominio real.
- `images/og-image.svg` es una imagen de marca simple para redes sociales; para máxima compatibilidad con Facebook/Twitter conviene exportarla a PNG/JPG (1200×630).
