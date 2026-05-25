---
name: run-entrefrutales
description: Lanza, previsualiza y modifica la web de la casa rural Entrefrutales. Usar cuando se pida ejecutar, arrancar, servir, abrir o ver el sitio; hacer una captura/screenshot; o editar contenido (secciones, galería de fotos, textos, traducciones i18n, tema claro/oscuro, mapa). Sitio estático single-page servido con `npx serve` y conducido con Edge headless vía DevTools Protocol.
---

# run-entrefrutales

Web estática de una sola página (`index.html`) para la casa rural **Entrefrutales**
(La Vilueña, Zaragoza). Sin build ni framework: HTML + CSS + JS vanilla. El idioma
y los textos se cargan en runtime desde `assets/data/translations.json` (i18n
es/en) mediante `fetch()`, por lo que **necesita un servidor HTTP real** — abrir
`index.html` con `file://` rompe las traducciones y la galería.

**Todas las rutas de este documento son relativas a la raíz del repo** (`entrefrutales-web/`).

El sitio se conduce con el driver **[shot.mjs](.claude/skills/run-entrefrutales/shot.mjs)**:
arranca `npx serve`, abre el sitio en Edge headless por el DevTools Protocol
(CDP), fuerza los `.reveal` visibles + oculta el loader, y captura **página
completa** o una **sección por selector**. Cero dependencias (usa el `WebSocket`
nativo de Node ≥22).

## Prerrequisitos

- **Node ≥ 22** (probado con v26) — aporta `WebSocket` global y ejecuta el driver.
- **`npx`** (viene con Node) — sirve el sitio con el paquete `serve` (se autodescarga la 1ª vez).
- **Microsoft Edge** instalado (Chromium). El driver lo busca en las rutas estándar de Windows.

No hay `npm install`: el repo no tiene dependencias propias.

## Run (camino del agente) — el driver

Desde la raíz del repo. Cada comando arranca el servidor, captura y lo detiene solo.

```powershell
# Página COMPLETA de la home -> .preview.png (por defecto)
node .claude/skills/run-entrefrutales/shot.mjs

# Una SECCIÓN concreta por selector CSS (ideal para verificar un cambio puntual)
node .claude/skills/run-entrefrutales/shot.mjs --selector=#habitaciones --out=.preview-rooms.png

# Solo el hero / above-the-fold (sin página completa)
node .claude/skills/run-entrefrutales/shot.mjs --viewport

# Forzar tema oscuro o idioma inglés
node .claude/skills/run-entrefrutales/shot.mjs --theme=dark
node .claude/skills/run-entrefrutales/shot.mjs --lang=en --out=.preview-en.png

# Iterar rápido: deja el servidor vivo entre capturas
node .claude/skills/run-entrefrutales/shot.mjs --keep
```

Selectores útiles (son los `id` de cada `<section>`): `#hero`, `#casa`,
`#reconocimientos`, `#habitaciones`, `#experiencia`, `#opiniones`, `#reserva`,
`#entorno`, `#contacto`. La galería está dentro de `#experiencia` (`#galleryGrid`).

Las capturas (`.preview*.png`) se guardan en la raíz del repo y están en
`.gitignore`. **Tras capturar, ABRE el PNG y míralo** — si sale en blanco o con
error, el cambio no está bien.

### Flags de shot.mjs

| Flag | Defecto | Qué hace |
|------|---------|----------|
| `--path=/` | `/` | Ruta del sitio a abrir |
| `--out=<png>` | `.preview.png` | Archivo de salida (relativo al repo) |
| `--selector=<css>` | — | Captura solo ese elemento (recorte) |
| `--viewport` | — | Captura solo el viewport, no la página entera |
| `--theme=light\|dark` | — | Fija `localStorage.theme` y recarga |
| `--lang=es\|en` | — | Fija `localStorage.lang` y recarga |
| `--keep` | — | No detiene el servidor al terminar |
| `--port=4317` | `4317` | Puerto del servidor local |
| `--width` / `--height` | `1440`/`900` | Tamaño del viewport |

## Run (camino humano)

Para verlo en un navegador normal:

```powershell
npx --yes serve -l 4317 .
# abre http://localhost:4317  (Ctrl-C para parar)
```

## Dónde tocar para cada tipo de cambio

| Quiero cambiar… | Archivo(s) |
|-----------------|-----------|
| Estructura / secciones / orden | `index.html` (cada sección es un `<section id="…">`) |
| Textos visibles | **No** se editan en el HTML: el texto va por `data-i18n="seccion.clave"`. Cambia el valor en `assets/data/translations.json` (en `es` **y** `en`) |
| Estilos / colores / layout | `assets/css/main.css` (paleta en variables CSS `:root`; tema oscuro con `[data-theme="dark"]`) |
| Lógica (carrusel, lightbox, scroll, tema, menú) | `assets/js/main.js` |
| Carga de traducciones / cambio de idioma | `assets/js/i18n.js` |
| Fotos de la galería | `assets/img/` + un `<figure class="gallery-item" data-cat="…" data-lightbox="assets/img/X.jpg">` en `index.html` |

### Cómo funciona el i18n (clave)

- En el HTML, cada texto traducible es un elemento con `data-i18n="seccion.clave"`
  (hay ~166). Si lleva `data-i18n-html`, el valor se inyecta como HTML.
- `assets/js/i18n.js` hace `fetch('assets/data/translations.json')`, detecta idioma
  (`localStorage.lang` → navegador → `es`) y rellena el DOM.
- **Regla de oro:** toda clave nueva debe existir en `es` y en `en` con la misma
  ruta anidada. Las secciones top-level del JSON son: `meta, nav, hero, hero_card,
  hero_facts, casa, recognitions, rooms, experiences, feature, gallery, video,
  testimonials, reservation, contact, location, entorno, contact_info, footer, cookies`.
- Tras cambiar `translations.json`, valida que sigue siendo JSON correcto:
  `node -e "JSON.parse(require('fs').readFileSync('assets/data/translations.json','utf8'));console.log('JSON OK')"`

### Cómo funciona la galería

- Cada foto es un `<figure class="gallery-item [large|tall|wide] reveal" data-cat="CATEGORIA"
  data-lightbox="assets/img/ARCHIVO.jpg">` con un `<img>` dentro, en `#galleryGrid`
  (dentro de `#experiencia`).
- Los filtros usan `data-cat` (p. ej. `exterior`, `fachada`, …). El lightbox lo
  construye `main.js` recogiendo todos los `[data-lightbox]`.
- Para **añadir** una foto: copia el `.jpg` a `assets/img/` y añade su `<figure>`.
  Para **quitarla**: borra su `<figure>` (y el archivo si no se usa en hero/carruseles).
- Las imágenes tienen versión `.webp` además de la original; usa la que ya referencie el HTML.

## Verificar un cambio (flujo recomendado)

1. Edita el archivo correspondiente (tabla de arriba).
2. Si tocaste `translations.json`, valida el JSON (comando de arriba).
3. Captura la sección afectada:
   `node .claude/skills/run-entrefrutales/shot.mjs --selector=#<seccion> --out=.preview-check.png`
4. Abre `.preview-check.png` y compruébalo de verdad.

## Gotchas (cicatrices reales de esta máquina)

- **`file://` no sirve.** El sitio usa `fetch()` para `translations.json`; sin
  servidor HTTP las traducciones y la galería quedan vacías. Usa siempre el driver o `npx serve`.
- **`msedge --screenshot` (CLI) solo captura el hero.** Las secciones usan
  reveal-on-scroll (IntersectionObserver) y quedan invisibles hasta hacer scroll,
  y el `#loader` tapa la página al cargar → las capturas salen en blanco. Por eso
  el driver usa **CDP** e inyecta CSS (`#loader{display:none}` + `.reveal{opacity:1}`)
  antes de capturar. No vuelvas al modo `--screenshot` para secciones inferiores.
- **Un viewport más alto NO hace scroll.** El hero es `min-height:100vh`, así que
  agrandar `--height` solo estira el hero. Para ver más abajo usa `--selector` o la
  captura de página completa (defecto), no un viewport gigante.
- **Node ≥20 en Windows exige `shell:true` para lanzar `npx.cmd`** (si no, `spawn EINVAL`).
  Ya está resuelto en el driver; sale un `DeprecationWarning` inofensivo de `shell:true`.
- **Matar `npx.cmd` no libera el puerto:** `npx` lanza un `node` hijo que sobrevive.
  El driver limpia matando al **dueño del puerto** con `Get-NetTCPConnection`
  (síncrono, antes de salir) para que corridas encadenadas no choquen.
- **El `.gitignore` ignora `.claude/`** salvo `skills/` y `agents/` (reglas de
  negación añadidas) — así esta skill y el agente sí se versionan, pero los
  ajustes locales de Claude no.

## Troubleshooting

| Síntoma | Causa / arreglo |
|---------|-----------------|
| `spawn EINVAL` al arrancar | Node viejo sin el fix; el driver ya usa `shell:true`. Asegúrate de ejecutar con Node ≥20. |
| `No se encontro msedge.exe` | Edge no está en la ruta estándar; edita la lista `EDGE` al inicio de `shot.mjs`. |
| Captura en blanco | Sección con reveal sin forzar: no uses `--no-reveal`; deja que el driver inyecte el CSS. |
| `Selector no encontrado: …` | El `id`/selector no existe en el DOM; revisa los `id` de las `<section>`. |
| "Servidor ya activo en :4317" | Quedó un server de una corrida con `--keep`; ciérralo: `Get-NetTCPConnection -LocalPort 4317 -State Listen \| %{ Stop-Process -Id $_.OwningProcess -Force }` |
