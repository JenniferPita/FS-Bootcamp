const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const HTML_FILES = [
  "index.html",
  "login.html",
  "nosotros.html",
  "playground.html",
  "precios.html",
  "privacidad.html",
  "recuperar-password.html",
  "registro.html",
  "terminos.html",
];

const ROOT_FILES = ["robots.txt", "sitemap.xml"];

const DIRS = ["css", "js", "images"];

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const file of [...HTML_FILES, ...ROOT_FILES]) {
  copyFile(file);
}

for (const dir of DIRS) {
  fs.cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
}

console.log(`dist/ generado con ${HTML_FILES.length} páginas, ${DIRS.join(", ")} y ${ROOT_FILES.join(", ")}.`);
