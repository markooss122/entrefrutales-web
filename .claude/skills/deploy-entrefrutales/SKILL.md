---
name: deploy-entrefrutales
description: Publica los cambios de la web Entrefrutales subiéndolos a GitHub (git add + commit + push a main), lo que dispara el despliegue automático en Vercel. Usar cuando se pida desplegar, publicar, subir a producción, "sube los cambios", "haz deploy", "publícalo en Vercel" o similar.
---

# deploy-entrefrutales

Publica los cambios del sitio. El flujo de despliegue de Entrefrutales es por
**integración Git → Vercel**: Vercel está conectado al repositorio de GitHub
(`markooss122/entrefrutales-web`) y **despliega automáticamente cada push a `main`**.
No hay CLI de Vercel ni `vercel.json`: no se ejecuta `vercel deploy`, basta con el push.

Por tanto, desplegar = `git add` + `git commit` + `git push origin main`. Eso lo hace
el driver **[deploy.ps1](.claude/skills/deploy-entrefrutales/deploy.ps1)**.

**Rutas relativas a la raíz del repo** (`entrefrutales-web/`).

## Prerrequisitos

- Repo git con remoto `origin` apuntando a GitHub (ya configurado).
- Identidad de git en el repo (ya fijada: `Marcos Alcega <marcosalcegaclariana@gmail.com>`).
- Credenciales de push a GitHub disponibles (el helper de credenciales ya autentica el push).

## Desplegar (camino del agente) — el driver

```powershell
# Publica TODO lo pendiente con un mensaje de commit
powershell -ExecutionPolicy Bypass -File .\.claude\skills\deploy-entrefrutales\deploy.ps1 -Message "Descripción del cambio"

# Ver qué se publicaría sin hacer nada (no commitea ni hace push)
powershell -ExecutionPolicy Bypass -File .\.claude\skills\deploy-entrefrutales\deploy.ps1 -Message "wip" -DryRun
```

El driver:
1. Verifica que es un repo git y en qué rama estás (avisa si no es `main`).
2. Muestra `git status -s` con lo que se va a publicar.
3. `git add -A` → `git commit -m <Message>` → `git push origin main`.
4. Imprime el hash del commit y recuerda que Vercel desplegará solo.

| Flag | Defecto | Qué hace |
|------|---------|----------|
| `-Message` (obligatorio) | — | Mensaje de commit |
| `-Branch` | `main` | Rama destino del push |
| `-DryRun` | — | Solo muestra qué haría |

### Antes de desplegar

Verifica el cambio con la skill hermana **run-entrefrutales** (captura la sección
afectada y míra el PNG). No publiques sin haber visto el resultado. Si tocaste
`assets/data/translations.json`, valida el JSON primero:

```powershell
node -e "JSON.parse(require('fs').readFileSync('assets/data/translations.json','utf8'));console.log('JSON OK')"
```

## Comprobar el despliegue

Tras el push, Vercel arranca el deploy en segundo plano (~1-2 min para un sitio
estático). Comprueba el estado en el dashboard de Vercel del proyecto, o que el
sitio en producción (`https://entrefrutales.info/` / el dominio `*.vercel.app`)
refleje el cambio.

## Gotchas

- **Vercel se dispara solo con el push.** No ejecutes `vercel`/`npx vercel` — no está
  instalado ni el proyecto está enlazado por CLI; el deploy es por integración Git.
- **`.gitignore` ya filtra** las capturas `.preview*.png` y lo local de `.claude`,
  así que `git add -A` no las sube. Las skills (`.claude/skills/`) y el agente
  (`.claude/agents/`) **sí** se versionan (reglas de negación en `.gitignore`).
- **git escribe progreso por stderr.** En PowerShell 5.1, `$ErrorActionPreference='Stop'`
  convertiría eso en error falso; el driver NO lo usa y comprueba `$LASTEXITCODE`.
- **Si el push falla** (credenciales/red), el commit ya quedó en local: arregla y
  reintenta solo `git push origin main` (no vuelvas a commitear).
- **El remoto tiene también `master`** además de `main`; despliega desde `main`
  (el `HEAD` de origin apunta a `main`). No hagas push a `master`.

## Troubleshooting

| Síntoma | Causa / arreglo |
|---------|-----------------|
| `git push fallo` | Credenciales o red. Reintenta `git push origin main`; el commit local ya existe. |
| `No hay cambios que publicar` | El árbol está limpio; no hay nada que desplegar. |
| Estás en una rama distinta de `main` | El driver avisa y haría push a esa rama; cambia a `main` con `git switch main` si querías producción. |
| El cambio no aparece en producción | El deploy de Vercel tarda 1-2 min, o falló en el dashboard de Vercel; revísalo allí. |
