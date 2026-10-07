# Mandelbrot fractal explorer

Explore the Mandelbrot set in the browser: zoom in by dragging a box (or pinching), change the
colours, share a view as a link, and export large PNGs. Rendering runs on web workers, one per CPU
thread less one.

## Setup

Needs Node 24 or later (see `.nvmrc`).

```bash
npm install
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves `src/` at http://localhost:8090 and opens it. The browser loads the ES modules directly, so edits show on reload, with no build step. A performance HUD shows depth per second and a benchmark. |
| `npm test` | Runs the Jasmine specs in `test/`. |
| `npm run lint` | Runs ESLint. |
| `npm run check` | Renders a few views and exports in Node, and checks the output is identical to `HEAD` (or another ref: `node dev/workerCheck.js <ref>`). Also reports worker and main-thread time per frame. |
| `npm run build` | Builds `latest/mandelbrotExplorer.html` and `latest/mandelbrotExplorer.min.js`. |
| `npm run dev:built` | Builds, then serves the built files with the HUD. |
| `npm run check:built` | Builds, then checks the bundle renders exactly as the source does. |

## Deploying

`npm run build`, then put the two files in `latest/` on any static web server, in the same folder.
Nothing runs on the server. The script is an ES module that also starts the web workers from itself,
so it must be served over HTTP(S) (not opened as a file), with a JavaScript content type.

## Layout

- `src/index.html`: the page.
- `src/client/main.js`: the entry point, for both the page and the workers.
- `src/client/app.js`: starts the explorer. `display.js` holds the parts remade when the window changes size.
- `src/client/pixelIterator.js`: the inner loop.
- `src/client/interactiveRenderer.js` and `export/exportRenderer.js`: the interactive view and image export.
- `dev/`: the dev server, HUD and render check. `build/`: the build.
