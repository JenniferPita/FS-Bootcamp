
$ErrorActionPreference = "Stop"

# Ejecutar desde la raíz del proyecto
Set-Location $PSScriptRoot

Write-Host "Preparando StockFlow para Netlify..."

# 1. Crear carpeta de publicación limpia
if (Test-Path ".\deploy") {
    Remove-Item ".\deploy" -Recurse -Force
}

New-Item -ItemType Directory -Path ".\deploy" | Out-Null

# 2. Copiar las páginas HTML originales
Copy-Item ".\*.html" ".\deploy\" -Force

# 3. Copiar recursos de la landing
foreach ($folder in @("css", "js", "images")) {
    if (Test-Path ".\$folder") {
        Copy-Item ".\$folder" ".\deploy\$folder" -Recurse -Force
    }
}

# 4. Compilar React directamente en deploy/app
Push-Location ".\app"

try {
    pnpm exec tsc -b
    if ($LASTEXITCODE -ne 0) {
        throw "Error al verificar TypeScript"
    }

    pnpm exec vite build --outDir ../deploy/app --emptyOutDir
    if ($LASTEXITCODE -ne 0) {
        throw "Error al compilar React"
    }
}
finally {
    Pop-Location
}

# 5. Crear redirección SPA para React Router
Set-Content -Path ".\deploy\_redirects" `
    -Value "/app/*    /app/index.html    200" `
    -Encoding ascii

# 6. Comprobar archivos requeridos
$required = @(
    ".\deploy\index.html",
    ".\deploy\app\index.html",
    ".\deploy\app\assets"
)

foreach ($path in $required) {
    if (-not (Test-Path $path)) {
        throw "Falta un archivo o carpeta: $path"
    }
}

# 7. Comprobar CSS y JavaScript de React
$css = Get-ChildItem ".\deploy\app\assets" -Filter "*.css"
$js  = Get-ChildItem ".\deploy\app\assets" -Filter "*.js"

if (-not $css -or -not $js) {
    throw "No se encontraron archivos CSS o JavaScript compilados"
}

Write-Host ""
Write-Host "Compilación completada." -ForegroundColor Green
Write-Host "Carpeta lista para Netlify: deploy"
