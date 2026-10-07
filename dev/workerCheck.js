// Checks that the interactive render pipeline produces exactly the same output as another revision.
//
//   node dev/workerCheck.js [git-ref | --built[=dir]] [--only=interactive|export] [--tolerance=N]      (default ref: HEAD)
//
// Runs the real main-thread code (the interactive renderer, the worker pool, histogram bookkeeping) and
// the real worker code in Node, with an in-process stand-in for Worker, for a fixed number of frames on
// a few views, and a few image exports. Every frame and export is hashed, so any difference in output
// between the working tree and the ref shows up as a hash mismatch.
// The step size is made deterministic by giving the renderer a stopwatch driven by a cost model.
// It also reports time per frame spent in the workers (all workers added together, as they run
// one after another here) and on the main thread including message copying. These are steadier
// than browser timings, but only comparable between runs on the same machine.
// It also recomputes the escape iteration of a sample of pixels from scratch, to check the output
// is right and not just unchanged.
// Each side's code is imported from src/client/main.js (or the built bundle), which exports what this
// needs. A ref's files are copied out of git into a temporary folder to import them.
// Exits with status 1 if any view differs or the working tree has wrong escape values.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ref = process.argv.slice(2).find((a) => !a.startsWith("--")) || "HEAD";
const defaultWidth = 700;
const defaultHeight = 400;
const parallelism = 3;

const defaultView = { x: -2.5, y: -1, w: 3.5, h: 2 };
const bulbView = { x: -0.35, y: 0.55, w: 0.45, h: 0.2571 };
const deepView = { x: -0.74364, y: 0.13182, w: 0.00003, h: 0.0000171 };
// switchAfter: change to the view in switchTo once that many frames have completed, while the
// next batch of jobs is still in the workers, as happens when you zoom or move during rendering.
const views = [
    { name: "default", frames: 60, view: defaultView },
    { name: "period-3 bulb", frames: 60, view: bulbView },
    { name: "deep", frames: 40, view: deepView },
    { name: "zoom while rendering", frames: 50, view: defaultView, switchAfter: 10, switchTo: bulbView },
    // Views too deep for doubles, rendered by perturbation, smaller so they don't take too long. They are
    // on the boundary of seahorse valley, where the whole image escapes, at 8,000 to 13,000 iterations.
    { name: "perturbation 1e-20", frames: 40, size: [280, 160],
        deep: { x: "-0.743643887037158704752191506114774", y: "0.131825904205311970493132056385139", pixelSize: 1e-20 } },
    { name: "perturbation 1e-63", frames: 40, size: [280, 160],
        deep: { x: "-0.743643887037158697752109999099993000080000600001999990000699993",
            y: "0.131825904205311973493009999700003999930000000009000049999099999", pixelSize: 1e-63 } }
];

// The renderer's stopwatch is replaced by a cost model so step sizes are deterministic but still
// respond to the work done: a frame takes 2ms plus (step size x pixels not yet escaped) iterations
// spread across the workers at this many iterations per millisecond each.
const modelIterationsPerMs = 600000;

// Copies src/ at revision into a temporary folder, returning the folder.
function checkout(revision) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nodelbrot-check-"));
    const git = (args, options) => execFileSync("git", args, { cwd: root, maxBuffer: 1 << 26, ...options });
    const files = git(["ls-tree", "-r", "--name-only", revision, "src"], { encoding: "utf8" }).split("\n").filter(Boolean);
    if (!files.includes("src/client/main.js")) {
        throw new Error(revision + " has no src/client/main.js, so predates ES modules and can't be compared with this check");
    }
    files.forEach((file) => {
        fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
        fs.writeFileSync(path.join(dir, file), git(["show", revision + ":" + file]));
    });
    // The code is ES modules, which Node only treats as such inside a package that says so.
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
    return dir;
}

// Message delivery queue shared by the main thread and all workers, processed in order.
function newScheduler() {
    const queue = [];
    return {
        workerMs: 0,
        post: function (task) { queue.push(task); },
        drain: function () {
            while (queue.length) queue.shift()();
        }
    };
}

// Stands in for new Worker(...): runs the worker code in this process, delivering messages through
// the scheduler, copied (or transferred) as a real worker's would be.
function workerFactory(api, scheduler) {
    return function () {
        const worker = { terminate: function () {} };
        const handle = api.createWorkerHandler(function (msg, transfer) {
            const copy = structuredClone(msg, { transfer: transfer || [] });
            scheduler.post(() => worker.onmessage && worker.onmessage({ data: copy }));
        });
        worker.postMessage = function (msg, transfer) {
            const copy = structuredClone(msg, { transfer: transfer || [] });
            scheduler.post(() => {
                const start = process.hrtime.bigint();
                handle({ data: copy });
                scheduler.workerMs += Number(process.hrtime.bigint() - start) / 1e6;
            });
        };
        return worker;
    };
}

// The events this uses, under their current names, from a revision that may use the names they had
// before they were renamed.
function eventNames(events) {
    const either = (name, oldName) => events[name] || events[oldName];
    return {
        viewChanged: either("viewChanged", "extentsUpdate"),
        escapesFromWorkers: either("escapesFromWorkers", "histogramUpdateReceivedFromWorker"),
        depthReached: either("depthReached", "maxIterationsUpdated"),
        frameComplete: events.frameComplete,
        paletteChanged: events.paletteChanged
    };
}

// Stands in for new Worker(...) for the reference orbit's worker, doing all that is asked of it at once,
// on the scheduler, so rendering is deterministic.
function orbitWorkerFactory(api, scheduler) {
    return function () {
        const worker = { terminate: function () {} };
        const handler = api.createReferenceOrbitWorker(function (msg, transfer) {
            const copy = structuredClone(msg, { transfer: transfer || [] });
            scheduler.post(() => worker.onmessage && worker.onmessage({ data: copy }));
        }, { sliceMs: Infinity, schedule: (next) => scheduler.post(next) });
        worker.postMessage = (msg) => {
            const copy = structuredClone(msg);
            scheduler.post(() => handler.onmessage({ data: copy }));
        };
        return worker;
    };
}

function render(api, view, workers) {
    if (view.deep && !api.createReferenceOrbit) {
        return { unsupported: true };
    }
    const width = view.size ? view.size[0] : defaultWidth;
    const height = view.size ? view.size[1] : defaultHeight;
    const scheduler = newScheduler();
    const events = api.createEvents();
    const named = eventNames(events);
    const pixels = width * height;
    const imgData = new Uint8ClampedArray(pixels * 4);
    const escapeValues = new Uint32Array(pixels);

    const hash = crypto.createHash("sha256");
    const escapeHash = crypto.createHash("sha256");
    const images = [];
    let frames = 0;
    let modelMs = 0;
    let lastStep = 0;
    let lastIteration = 0;
    let harnessMs = 0;   // time spent here recording frames, left out of the main thread figure

    events.listenTo(named.escapesFromWorkers, (u) => { lastStep = u.update.length; });
    const stopwatch = {
        start: function () {}, stop: function () {}, elapsed: function () {
            let active = 0;
            for (let p = 0; p < escapeValues.length; p += 1) if (escapeValues[p] === 0) active += 1;
            const ms = 2 + (lastStep * active) / (parallelism * modelIterationsPerMs);
            modelMs += ms;
            return ms;
        }
    };
    events.listenTo(named.depthReached, (i) => { lastIteration = i; });
    // As the app does, the reference orbit hears of a new view before the renderer.
    const referenceOrbit = view.deep ? api.createReferenceOrbit({ events, newWorker: orbitWorkerFactory(api, scheduler) }) : null;
    api.createEscapeHistogram(events, new Uint32Array(api.initialHistogramSize));
    const calculator = api.createInteractiveRenderer({
        width: width, height: height, events: events, workers: workers || parallelism, newWorker: workerFactory(api, scheduler),
        imgData: imgData, escapeValues: escapeValues, xState: new Float64Array(pixels), yState: new Float64Array(pixels),
        imageEscapeValues: new Uint32Array(pixels), stopwatch: stopwatch, referenceOrbit: referenceOrbit
    });
    // Views are given to the renderer as exact rectangles, so revisions that place pixels from the
    // view's centre and those that took rectangles render the same pixels. Revisions with views ask
    // for the view's area.
    const viewRectangle = (v) => api.viewAt ? {area: () => api.rectangle(v.x, v.y, v.w, v.h)} : api.rectangle(v.x, v.y, v.w, v.h);
    events.listenTo(named.frameComplete, function () {
        const recordStart = process.hrtime.bigint();
        hash.update(Buffer.from(imgData.buffer, imgData.byteOffset, imgData.byteLength));
        hash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
        escapeHash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
        images.push(new Uint8Array(imgData));
        harnessMs += Number(process.hrtime.bigint() - recordStart) / 1e6;
        frames += 1;
        if (frames === view.switchAfter) {
            // Runs after the renderer has posted its next batch, before the workers handle it.
            scheduler.post(() => events.fire(named.viewChanged, viewRectangle(view.switchTo)));
        }
        if (frames >= view.frames) calculator.stop();
    });
    const palette = api.createPalette();
    events.fire(named.paletteChanged, palette);
    events.fire(named.viewChanged, view.deep ? api.viewAt(view.deep.x, view.deep.y, view.deep.pixelSize) : viewRectangle(view.view));
    events.fire(named.paletteChanged, palette);
    calculator.start();

    const start = process.hrtime.bigint();
    scheduler.drain();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return {
        hash: hash.digest("hex").slice(0, 16), escapeHash: escapeHash.digest("hex"), images: images, frames: frames, depth: lastIteration,
        workerMs: scheduler.workerMs, mainMs: ms - scheduler.workerMs - harnessMs, modelMs: modelMs,
        escapes: view.deep ? checkDeepEscapes(api, view.deep, width, height, escapeValues, lastIteration)
            : checkEscapes(api, view.switchTo || view.view, width, height, escapeValues, lastIteration)
    };
}

// Like checkEscapes, for a deep view: a sample of pixels is worked out exactly in fixed point. Some
// pixels sit on detail far finer than the pixel, where moving by a millionth of a pixel changes the count
// by hundreds, and rounding is enough to: up to 3% of the sample may differ for that reason.
function checkDeepEscapes(api, deep, width, height, escapeValues, lastIteration) {
    const view = api.viewAt(deep.x, deep.y, deep.pixelSize);
    const bits = view.bits;
    const shift = BigInt(bits);
    const sixteen = 16n << (2n * shift);
    let limit = lastIteration;
    for (let p = 0; p < escapeValues.length; p += 1) limit = Math.max(limit, escapeValues[p]);
    const result = { checked: 0, wrong: 0, firstWrong: null, allowed: 0 };
    for (let p = 0; p < escapeValues.length; p += 211) {
        const cx = view.x + api.fromNumber(((p % width) - ((width - 1) / 2)) * deep.pixelSize, bits);
        const cy = view.y + api.fromNumber((Math.floor(p / width) - ((height - 1) / 2)) * deep.pixelSize, bits);
        let zx = 0n, zy = 0n, expected = 0;
        for (let n = 1; n <= limit; n += 1) {
            const xx = zx * zx, yy = zy * zy;
            if (xx + yy > sixteen) { expected = n; break; }
            const xy = zx * zy;
            zx = ((xx - yy) >> shift) + cx;
            zy = (xy >> (shift - 1n)) + cy;
        }
        const actual = escapeValues[p];
        const ok = actual !== 0 ? actual === expected : (expected === 0 || expected > lastIteration);
        result.checked += 1;
        if (!ok) {
            result.wrong += 1;
            result.firstWrong = result.firstWrong || { pixel: p, expected: expected, actual: actual };
        }
    }
    result.allowed = Math.floor(result.checked * 0.03);
    return result;
}

// Recomputes the escape iteration of a sample of pixels from scratch and compares it with the
// renderer's escape values. A pixel that has escaped must have escaped at exactly the right
// iteration, and one that hasn't must not escape by the start of the last frame.
function checkEscapes(api, view, width, height, escapeValues, lastIteration) {
    const fragments = api.renderFragments(view.x, view.y, view.w, view.h, width, height).split(parallelism);
    let limit = lastIteration;
    for (let p = 0; p < escapeValues.length; p += 1) limit = Math.max(limit, escapeValues[p]);
    const result = { checked: 0, wrong: 0, firstWrong: null };
    fragments.forEach(function (fragment) {
        const e = fragment.extents;
        for (let p = 0; p < fragment.rows * fragment.columns; p += 13) {
            const i = p % fragment.columns;
            const row = fragment.firstRow + Math.floor(p / fragment.columns) * fragment.rowStride;
            const expected = api.calculatePoint(e.mx + (i * e.stepX), e.my + (row * e.stepY), limit, 0, 0, 0, 0).histogramEscapedAt;
            const actual = escapeValues[(row * fragment.columns) + i];
            const ok = actual !== 0 ? actual === expected : (expected === 0 || expected > lastIteration);
            result.checked += 1;
            if (!ok) {
                result.wrong += 1;
                result.firstWrong = result.firstWrong || { pixel: fragment.offset + p, expected: expected, actual: actual };
            }
        }
    });
    return result;
}

function describeEscapes(e) {
    if (e.wrong > 0 && e.wrong <= e.allowed) {
        return "escapes ok (" + e.wrong + "/" + e.checked + " on detail finer than a pixel)";
    }
    return e.wrong === 0 ? "escapes ok" :
        "escapes WRONG " + e.wrong + "/" + e.checked + " (e.g. pixel " + e.firstWrong.pixel + ": expected " +
        e.firstWrong.expected + ", got " + e.firstWrong.actual + ")";
}

// Image export with the default palette, through renderExport (the whole export apart from showing
// the image). Returns a hash of the exported image.
// A deep export is of the area exp.width x exp.height pixels of exp.deep.pixelSize, by perturbation from
// the orbit of its centre.
function exportImage(api, exp) {
    if (exp.deep && !api.createOrbitCalculator) {
        return { unsupported: true };
    }
    const scheduler = newScheduler();
    let image;
    let extents, orbit = null;
    if (exp.deep) {
        const view = api.viewAt(exp.deep.x, exp.deep.y, exp.deep.pixelSize);
        const calculator = api.createOrbitCalculator(view.x, view.y, view.bits);
        // Revisions before nuclei call a complete orbit escaped.
        orbit = { generation: 1, values: calculator.next(exp.depth + 2), escaped: calculator.escaped(), complete: calculator.escaped() };
        const w = (exp.width - 1) * exp.deep.pixelSize, h = (exp.height - 1) * exp.deep.pixelSize;
        extents = api.rectangle(-w / 2, -h / 2, w, h);
    } else {
        const v = exp.view;
        extents = api.rectangle(v.x, v.y, v.w, v.h);
    }
    api.renderExport({
        extents: extents, width: exp.width, height: exp.height, depth: exp.depth, orbit: orbit,
        palette: api.createPalette(), newWorker: workerFactory(api, scheduler), workers: parallelism,
        onComplete: (imageData) => { image = imageData; }
    });
    const start = process.hrtime.bigint();
    scheduler.drain();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return {
        hash: crypto.createHash("sha256").update(Buffer.from(image.buffer)).digest("hex").slice(0, 16), images: [new Uint8Array(image)],
        workerMs: scheduler.workerMs, mainMs: ms - scheduler.workerMs
    };
}

const exportScenarios = [
    { name: "export default view", view: defaultView, width: 1400, height: 800, depth: 1000 },
    { name: "export period-3 bulb", view: bulbView, width: 700, height: 400, depth: 5000 },
    { name: "export perturbation 1e-20", width: 400, height: 240, depth: 15000,
        deep: { x: "-0.743643887037158704752191506114774", y: "0.131825904205311970493132056385139", pixelSize: 1e-20 } }
];

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
// With --tolerance=N, output that differs only in colour, by at most N per channel, passes as CLOSE.
// Interactive escape values must still be identical.
const toleranceArg = process.argv.find((a) => a.startsWith("--tolerance="));
const tolerance = toleranceArg ? Number(toleranceArg.slice(12)) : null;

function compareImages(a, b) {
    let maxDiff = 0;
    let pixelsDiffering = 0;
    let pixelsDifferingByMoreThan3 = 0;
    let pixels = 0;
    for (let f = 0; f < Math.min(a.length, b.length); f += 1) {
        for (let p = 0; p < a[f].length; p += 4) {
            let pixelDiff = 0;
            for (let c = 0; c < 4; c += 1) pixelDiff = Math.max(pixelDiff, Math.abs(a[f][p + c] - b[f][p + c]));
            if (pixelDiff) pixelsDiffering += 1;
            if (pixelDiff > 3) pixelsDifferingByMoreThan3 += 1;
            maxDiff = Math.max(maxDiff, pixelDiff);
            pixels += 1;
        }
    }
    return { maxDiff: maxDiff, percentDiffering: 100 * pixelsDiffering / pixels, percentDifferingByMoreThan3: 100 * pixelsDifferingByMoreThan3 / pixels };
}

// SAME, CLOSE (within tolerance) or DIFFER, and whether that counts as a pass.
function verdict(results, escapesMatch) {
    if (results[0].hash === results[1].hash && results[0].frames === results[1].frames) return { label: "SAME   ", pass: true };
    if (tolerance === null || !escapesMatch || results[0].frames !== results[1].frames) return { label: "DIFFER ", pass: false };
    const c = compareImages(results[0].images, results[1].images);
    const detail = " [max channel difference " + c.maxDiff + ", " + c.percentDiffering.toFixed(3) + "% of pixels differ, " +
        c.percentDifferingByMoreThan3.toFixed(3) + "% by more than 3]";
    return c.maxDiff <= tolerance ? { label: "CLOSE  ", pass: true, detail: detail } : { label: "DIFFER ", pass: false, detail: detail };
}

const importFrom = (file) => import(pathToFileURL(file).href);
const workingTree = { label: "working tree", api: await importFrom(path.join(root, "src/client/main.js")) };
// With --built[=dir], compares the working tree's source with the bundle built from it (default
// dir: latest), instead of with a ref.
const builtArg = process.argv.find((a) => a === "--built" || a.startsWith("--built="));
const sides = builtArg ? [
    workingTree,
    { label: "built", api: await importFrom(path.resolve(root, builtArg.includes("=") ? builtArg.slice(8) : "latest", "mandelbrotExplorer.min.js")) }
] : [
    { label: ref, api: await importFrom(path.join(checkout(ref), "src/client/main.js")) },
    workingTree
];
let failures = 0;
const tooManyWrong = (escapes) => escapes.wrong > (escapes.allowed || 0);
(only === "export" ? [] : views).forEach((view) => {
    const results = sides.map((side) => render(side.api, view));
    // A scenario the other side can't render (it predates perturbation) is only checked for escapes.
    const v = results[0].unsupported ? { label: "NEW    ", pass: true, detail: " (not in " + sides[0].label + ")" }
        : verdict(results, results[0].escapeHash === results[1].escapeHash);
    if (!v.pass || tooManyWrong(results[1].escapes)) failures += 1;
    console.log(v.label + view.name + " (" + results[1].frames + " frames)" + (v.detail || ""));
    results.forEach((r, i) => r.unsupported || console.log("    " + sides[i].label.padEnd(14) + r.hash +
        "  depth " + String(r.depth).padStart(6) + "  model depth/s " + String(Math.round(r.depth / (r.modelMs / 1000))).padStart(7) +
        "  workers " + (r.workerMs / r.frames).toFixed(2).padStart(6) + " ms/frame" +
        "  main thread " + (r.mainMs / r.frames).toFixed(2).padStart(6) + " ms/frame  " + describeEscapes(r.escapes)));
});
// The number of workers depends on the machine, so the output must not: render the same views with 3
// and with 16 workers and require identical frames.
(only === "export" ? [] : views.slice(0, 2).concat(views.filter((v) => v.name === "perturbation 1e-20"))).forEach((view) => {
    const side = sides[1];
    const few = render(side.api, view, 3);
    const many = render(side.api, view, 16);
    const same = few.hash === many.hash && few.frames === many.frames;
    if (!same) failures += 1;
    console.log((same ? "SAME   " : "DIFFER ") + view.name + " with 3 and 16 workers (" + side.label + ")");
    [few, many].forEach((r, i) => console.log("    " + (i === 0 ? "3 workers" : "16 workers").padEnd(14) + r.hash));
});
// The share of pixels the same colour as the one to their right. Detailed images have about a third;
// banded ones, where doubles have run out, most.
function sameAsNeighbour(image, width) {
    let same = 0, pairs = 0;
    for (let p = 0; p + 4 < image.length; p += 4) {
        if ((p / 4) % width === width - 1) continue;
        pairs += 1;
        if (image[p] === image[p + 4] && image[p + 1] === image[p + 5] && image[p + 2] === image[p + 6]) same += 1;
    }
    return same / pairs;
}

(only === "interactive" ? [] : exportScenarios).forEach((exp) => {
    const results = sides.map((side) => exportImage(side.api, exp));
    const v = results[0].unsupported ? { label: "NEW    ", pass: true, detail: " (not in " + sides[0].label + ")" } : verdict(results, true);
    const banded = exp.deep && sameAsNeighbour(results[1].images[0], exp.width) > 0.6;
    if (!v.pass || banded) failures += 1;
    console.log(v.label + exp.name + " (" + exp.width + "x" + exp.height + ", depth " + exp.depth + ")" + (v.detail || "") +
        (exp.deep ? (banded ? " BANDED" : " detailed") + ", " + Math.round(100 * sameAsNeighbour(results[1].images[0], exp.width)) + "% same as neighbour" : ""));
    results.forEach((r, i) => r.unsupported || console.log("    " + sides[i].label.padEnd(14) + r.hash +
        "  workers " + (r.workerMs / 1000).toFixed(2).padStart(7) + " s" +
        "  main thread " + (r.mainMs / 1000).toFixed(2).padStart(6) + " s"));
});
process.exit(failures ? 1 : 0);
