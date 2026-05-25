#!/usr/bin/env node
/*
 * shot.mjs — driver principal de la skill run-entrefrutales.
 *
 * Sirve el sitio (npx serve) y lo controla con Edge por el DevTools Protocol
 * (CDP) usando el WebSocket nativo de Node (>=22). CERO dependencias.
 *
 * Por que CDP y no `msedge --screenshot`:
 *   Las secciones usan animacion reveal-on-scroll (IntersectionObserver) y
 *   quedan invisibles hasta hacer scroll; ademas un #loader tapa la pagina al
 *   cargar. La captura headless por CLI solo coge el hero. Aqui inyectamos CSS
 *   para forzar `.reveal` visibles y ocultar el #loader, y capturamos la
 *   PAGINA COMPLETA (captureBeyondViewport) o una seccion por selector.
 *
 * Uso (desde la raiz del repo):
 *   node .claude/skills/run-entrefrutales/shot.mjs                       # home, pagina completa
 *   node .claude/skills/run-entrefrutales/shot.mjs --selector=#habitaciones --out=.preview-rooms.png
 *   node .claude/skills/run-entrefrutales/shot.mjs --viewport            # solo el hero (above-the-fold)
 *   node .claude/skills/run-entrefrutales/shot.mjs --theme=dark          # fuerza modo oscuro
 *   node .claude/skills/run-entrefrutales/shot.mjs --lang=en             # fuerza idioma EN
 *   node .claude/skills/run-entrefrutales/shot.mjs --keep                # deja el server vivo para iterar
 *
 * Flags: --path=/  --out=.preview.png  --port=4317  --width=1440 --height=900
 *        --selector=<css>  --viewport (no full page)  --full (por defecto)
 *        --theme=light|dark  --lang=es|en  --keep  --no-reveal (no forzar reveals)
 */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..', '..', '..'); // skill -> skills -> .claude -> repo

// ---------- args ----------
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const PATHQ   = args.path ?? '/';
const OUT      = path.resolve(repo, args.out ?? '.preview.png');
const DPORT    = Number(args.dport ?? 9333);
const PORT     = Number(args.port ?? 4317);
const WIDTH    = Number(args.width ?? 1440);
const HEIGHT   = Number(args.height ?? 900);
const SELECTOR = args.selector ?? null;
const FULL     = !args.viewport && !SELECTOR;   // pagina completa salvo viewport/selector
const THEME    = args.theme ?? null;            // light | dark
const LANG     = args.lang ?? null;             // es | en
const KEEP     = !!args.keep;
const REVEAL   = !args['no-reveal'];

// ---------- localizar Edge ----------
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));
if (!EDGE) { console.error('No se encontro msedge.exe.'); process.exit(1); }

// ---------- util: puerto en escucha ----------
const portUp = (p) => new Promise((res) => {
  const s = net.connect(p, '127.0.0.1');
  s.on('connect', () => { s.destroy(); res(true); });
  s.on('error', () => res(false));
});
async function waitPort(p, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await portUp(p)) return true; await sleep(300); }
  return false;
}

// ---------- arrancar servidor del sitio ----------
let serverProc = null;
async function ensureServer() {
  if (await portUp(PORT)) { console.log(`Servidor ya activo en :${PORT}.`); return; }
  console.log(`Arrancando 'npx serve' en :${PORT}...`);
  // Node >=20 en Windows exige shell:true para lanzar .cmd (npx.cmd), si no -> EINVAL.
  serverProc = spawn('npx.cmd', ['--yes', 'serve', '-l', String(PORT), '.'],
    { cwd: repo, stdio: 'ignore', windowsHide: true, shell: true });
  if (!await waitPort(PORT, 40000)) throw new Error('El servidor no respondio en 40s.');
  console.log('Servidor listo.');
}

// ---------- CDP minimo sobre WebSocket nativo ----------
async function cdpConnect() {
  const profile = path.join(process.env.TEMP || '/tmp', 'ef-edge-cdp');
  const url = `http://localhost:${PORT}${PATHQ}`;
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', `--remote-debugging-port=${DPORT}`,
    `--user-data-dir=${profile}`, `--window-size=${WIDTH},${HEIGHT}`, url,
  ], { stdio: 'ignore', windowsHide: true });

  // esperar al endpoint de depuracion y localizar el target de pagina
  let wsUrl = null;
  const end = Date.now() + 20000;
  while (Date.now() < end && !wsUrl) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* aun arrancando */ }
    if (!wsUrl) await sleep(300);
  }
  if (!wsUrl) { edge.kill(); throw new Error('No se pudo conectar al DevTools de Edge.'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const cmd = (method, params = {}) => new Promise((res) => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { edge, ws, cmd };
}

// ---------- main ----------
let edgeRef = null;
try {
  await ensureServer();
  const { edge, cmd } = await cdpConnect();
  edgeRef = edge;

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',
    { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

  // Pre-ajustes via localStorage (tema/idioma persisten por las claves que usa el sitio)
  const pre = [];
  if (THEME) pre.push(`localStorage.setItem('theme','${THEME}')`);
  if (LANG)  pre.push(`localStorage.setItem('lang','${LANG}')`);
  if (pre.length) {
    await cmd('Runtime.evaluate', { expression: pre.join(';') });
    await cmd('Page.reload', {});
  }
  await sleep(2500); // dejar que cargue translations.json, leaflet y se vaya el loader

  // forzar visibilidad: ocultar loader + revelar secciones animadas
  if (REVEAL) {
    const css = `#loader{display:none!important}.reveal{opacity:1!important;transform:none!important}`;
    await cmd('Runtime.evaluate', { expression:
      `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` +
      `document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));})()` });
    await sleep(400);
  }

  // calcular clip si hay selector
  let clip = null;
  if (SELECTOR) {
    const r = await cmd('Runtime.evaluate', {
      expression:
        `(()=>{const el=document.querySelector(${JSON.stringify(SELECTOR)});if(!el)return null;` +
        `el.scrollIntoView();const b=el.getBoundingClientRect();` +
        `return JSON.stringify({x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height});})()`,
      returnByValue: true,
    });
    const val = r.result?.result?.value;
    if (!val) throw new Error(`Selector no encontrado: ${SELECTOR}`);
    const b = JSON.parse(val);
    clip = { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 };
    await sleep(300);
  }

  const shot = await cmd('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: FULL || !!clip,
    ...(clip ? { clip } : {}),
  });
  const data = shot.result?.data;
  if (!data) throw new Error('captureScreenshot no devolvio datos.');
  fs.writeFileSync(OUT, Buffer.from(data, 'base64'));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`OK -> ${OUT} (${kb} KB)`);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exitCode = 1;
} finally {
  if (edgeRef) edgeRef.kill();
  if (serverProc && !KEEP) {
    serverProc.kill();
    // matar tambien el node hijo que ocupa el puerto (npx -> node).
    // execSync (no spawn detached) para que termine ANTES de salir; si no,
    // una corrida encadenada encontraria el puerto aun ocupado.
    try {
      execSync('powershell -NoProfile -Command "' +
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ` +
        'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
        { stdio: 'ignore' });
    } catch { /* puerto ya libre */ }
    console.log(`Servidor del puerto ${PORT} detenido.`);
  } else if (serverProc && KEEP) {
    console.log(`Servidor sigue activo en http://localhost:${PORT} (usa --keep en la proxima o ciérralo a mano).`);
    serverProc.unref();
  }
  await sleep(500);
  process.exit(process.exitCode || 0);
}
