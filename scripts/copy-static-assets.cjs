const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'dist');
for (const name of ['css','js','images']) {
 fs.cpSync(path.join(root,name),path.join(dest,name),{recursive:true,force:true});
}
for (const name of ['robots.txt','sitemap.xml']) {
 fs.copyFileSync(path.join(root,name),path.join(dest,name));
}
console.log('Archivos estáticos originales copiados a dist/.');
