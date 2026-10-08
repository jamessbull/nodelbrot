# Mandelbrot fractal explorer

Explore the Mandelbrot set in the browser: zoom in by dragging a box (or pinching), change the
colours, share a view as a link, and export large PNGs. Rendering runs on web workers, one per CPU
thread less one.

Zooming goes down to pixels 1e-300 across. Past about 1e-13, where doubles run out, the point at the
centre of the view is iterated exactly (in BigInt fixed point) as a reference orbit, and every pixel
is iterated as a small difference from it (perturbation, with rebasing), which doubles hold precisely
at any depth. Meanwhile a worker looks for the nucleus of a mini Mandelbrot set near the centre (finding
its period by the ball method, then the nucleus by Newton's method) and, if it finds one, the reference
moves there: its orbit never escapes, and one period of it is all that's needed. Where there's none,
pixels still going long after the reference escaped start again from one of them instead.

Where the browser has WebGL2 with float render targets (and blending into them), the view is rendered on the GPU instead, by the
same perturbation in 32-bit floats, all the way down (past 1e-25, with each pixel's difference kept as
a mantissa and a power of two, as 32-bit floats alone run out at about 1e-38).
The menu at the end of the toolbar says which is drawing the view, and can have the CPU draw them all
(remembered for next time; `?renderer=cpu` or `?renderer=gpu` in the address overrides it). If the
browser takes the GPU away, the CPU takes over until the view next moves.

When a new view is slow to appear, a gauge down the left of the image shows how deep rendering has
gone, coming down to meet the depth the view before had reached.

Exports of views the GPU draws are rendered on the GPU too, in tiles (pixels in the main cardioid and
bulb marked first, where doubles can tell). On the CPU, deep views skip runs of iterations while pixels
are close to the reference orbit (bivariate linear approximation), and pixels whose iteration comes
round to exactly where it was are known to be in the set and left.

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
| http://localhost:8090/dev/gpuCheck.html | With `npm run dev` running: renders views on the GPU and the CPU and compares their escape counts. |

## Deploying

`npm run build`, then put the two files in `latest/` on any static web server, in the same folder.
Nothing runs on the server. The script is an ES module that also starts the web workers from itself,
so it must be served over HTTP(S) (not opened as a file), with a JavaScript content type.

## Layout

- `src/index.html`: the page.
- `src/client/main.js`: the entry point, for both the page and the workers.
- `src/client/app.js`: starts the explorer. `display.js` holds the parts remade when the window changes size.
- `src/client/worker/`: the code the web workers run. `pixelIterator.js` is the inner loop; `perturbationIterator.js` is the one for deep views, and `referenceOrbit.js` works out their reference orbits, and `nucleus.js` finds nuclei to base them on.
- `src/client/gpu/`: the WebGL2 renderer and its shaders.
- `src/client/view.js` and `fixed.js`: the view, held precisely enough for deep zooms.
- `src/client/interactiveRenderer.js` and `export/exportRenderer.js`: the interactive view and image export.
- `dev/`: the dev server, HUD and render check. `build/`: the build.
