# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies (only devDependency is `typescript`).
- `npm run build` — runs `tsc`, compiling `ts/*.ts` → `js/*.js` per `tsconfig.json`. Run this after editing any `.ts` file; the files in `js/` are generated output and should not be hand-edited.
- `npx serve .` — serve the static site locally (there is no `dev`/`start` script in `package.json`).
- The `test` script in `package.json` is a placeholder (`exit 1`) — there is no real test suite.

## Architecture

This is a static marketing site (StockFlow, an inventory-management SaaS) with 5 HTML pages: `index.html`, `precios.html`, `registro.html`, `login.html`, `recuperar-password.html`. There is no HTML include/templating system — header, nav, and footer markup is copy-pasted identically across all 5 files, so any nav/footer change must be manually repeated in each one.

**CSS** is modular but every HTML page still links only `css/styles.css` — that file has no rules of its own, just `@import` statements pulling in `css/variables.css` → `css/base.css` → `css/layout.css` → `css/components.css` → the 6 backoffice-playground component files (`alerts.css`, `botones.css`, `checkboxes-radios.css`, `dialogs.css`, `menus.css`, `toasts.css`) → `css/responsive.css`, in that exact order. **`responsive.css` must stay last**: it holds the `@media (min-width: 621px)`/`(901px)` breakpoint overrides, several of which rely on being later in source order than their same-specificity base rule in `components.css` to win (see the comment at the top of `responsive.css`). The whole site is mobile-first: unprefixed rules in `layout.css`/`components.css` are the mobile layout, and `responsive.css` layers on tablet/desktop enhancements.

**Backoffice component playground** (`playground.html`): a standalone page showcasing 6 interaction components (Alerts, Botones, Checkboxes/Radios, Dialogs, Menús, Toasts) with their real HTML and documented keyboard/focus behavior. Its component classes (`c-alert*`, `c-btn*`, `c-check*`/`c-radio*`, `c-dialog*`, `c-menu-account*`, `c-toast*`) live in their own empty-selector CSS files under `css/`, imported by `styles.css` as noted above — properties are added by hand, not generated. Its interactive behavior (dialog focus trap/return, menu open/close, toast auto-dismiss) is in `ts/playground.ts` → compiled to `js/playground.js`, loaded the same classic-script way as the rest of `ts/`.

Design tokens live in `css/variables.css` (`:root`):
- Colors: `--color-*`, with a dark variant applied both via `prefers-color-scheme: dark` and via `:root[data-theme="dark"]` (manual override).
- Spacing: `--space-1` through `--space-20`, where `--space-N` = `N * 0.25rem`.
- Typography: `--font-family-base`, `--font-size-*`, `--font-weight-*`.
Check for an existing equivalent token before introducing a new hardcoded value. `css/components.css` is one file holding every section's styles (header, hero, pricing, forms, footer, etc.) back to back in the same order they used to appear in the old monolithic stylesheet — when adding a new section, append its rules there rather than creating a new top-level CSS file, to keep the "one file per concern" structure from re-fragmenting.

**Theme (light/dark)**: the user's choice is persisted in `localStorage`. Every HTML page has an inline `<script>` in `<head>` (before the stylesheet link) that applies `data-theme` to `<html>` pre-render to avoid a flash of the wrong theme. `ts/theme.ts` handles the interactive toggle and syncs `localStorage`.

**TypeScript build model**: `ts/*.ts` files compile to `js/*.js` as classic scripts (not ES modules), loaded via `<script defer>`. Because they're not modules, all `ts/` files share one global TypeScript scope during compilation — top-level identifiers (interfaces, regex `const`s, `validate*` functions) must be given a unique prefix per file (e.g. `LoginFieldConfig`/`RegistroFieldConfig`, `LOGIN_EMAIL_PATTERN`/`RECOVER_EMAIL_PATTERN`). Reusing a name across two `ts/` files causes `tsc` to fail with a redeclaration error even though the files never run together in the browser.

**Form validation pattern** (`ts/contact-form.ts`, `ts/registro-form.ts`, `ts/login-form.ts`, `ts/recuperar-password-form.ts`): each field's input has `aria-describedby` pointing to a `<p class="form-error" role="alert">`; on validation failure the parent `.form-group` gets an `is-invalid` class; overall submit feedback goes in a `<div class="form-feedback" role="status" aria-live="polite">`. No form has a real backend — all `<form>` elements use `action="#"` and validation is client-side only.

**Navigation drawer** (`js/nav.js`, compiled from `ts/nav.ts`): toggles an `nav-open` class on `<body>` for the mobile menu.

**SEO**: `robots.txt` and `sitemap.xml` currently reference the placeholder domain `example.com` — update before deploying to a real domain. `images/og-image.svg` is the Open Graph / Twitter Card image.

**`PLAN.md`** tracks an in-progress product roadmap for this site (login/password-recovery pages are done; real Terms/Privacy pages, real social proof, and de-duplicating pricing/results content between `index.html` and `precios.html` are still pending). Check it before starting new page/content work.
