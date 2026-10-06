// Checks that the interactive render pipeline produces exactly the same output as another revision.
//
//   node dev/workerCheck.js [git-ref] [--only=interactive|export] [--tolerance=N]      (default ref: HEAD)
//
// Runs the real main-thread code (webworkerInteractive, the worker pool, histogram bookkeeping) and
// the real worker code (unifiedworker.js) in Node, with an in-process stand-in for Worker, for a
// fixed number of frames on a few views, and a few image exports. Every frame and export is hashed, so any
// difference in output between the working tree and the ref shows up as a hash mismatch.
// The step size is made deterministic by giving the renderer a stopwatch driven by a cost model.
// It also reports time per frame spent in the workers (all workers added together, as they run
// one after another here) and on the main thread including message copying. These are steadier
// than browser timings, but only comparable between runs on the same machine.
// It also recomputes the escape iteration of a sample of pixels from scratch, to check the output
// is right and not just unchanged.
// Exits with status 1 if any view differs or the working tree has wrong escape values.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const ref = process.argv.slice(2).find((a) => !a.startsWith("--")) || "HEAD";
const width = 700;
const height = 400;
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
    { name: "zoom while rendering", frames: 50, view: defaultView, switchAfter: 10, switchTo: bulbView }
];

// The renderer's stopwatch is replaced by a cost model so step sizes are deterministic but still
// respond to the work done: a frame takes 2ms plus (step size x pixels not yet escaped) iterations
// spread across the workers at this many iterations per millisecond each.
const modelIterationsPerMs = 600000;

function sourceReader(revision) {
    const cache = {};
    return function (file) {
        if (!(file in cache)) {
            cache[file] = revision === null
                ? fs.readFileSync(path.join(root, file), "utf8")
                : execFileSync("git", ["show", revision + ":" + file], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
        }
        return cache[file];
    };
}

function newContext() {
    const ctx = { console: console };
    ctx.self = ctx;
    vm.createContext(ctx);
    return ctx;
}

function run(ctx, read, file) {
    vm.runInContext(read(file), ctx, { filename: file });
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

function workerClass(read, scheduler) {
    return function FakeWorker(url) {
        const self = this;
        const ctx = newContext();
        ctx.importScripts = function () {
            Array.prototype.forEach.call(arguments, (script) => run(ctx, read, script.replace(/^\/js\//, "src/client/")));
        };
        ctx.postMessage = function (msg, transfer) {
            const copy = structuredClone(msg, { transfer: transfer || [] });
            scheduler.post(() => self.onmessage && self.onmessage({ data: copy }));
        };
        run(ctx, read, url.replace(/^\/js\//, "src/client/"));
        self.postMessage = function (msg, transfer) {
            const copy = structuredClone(msg, { transfer: transfer || [] });
            scheduler.post(() => {
                const start = process.hrtime.bigint();
                vm.runInContext("onmessage", ctx)({ data: copy });
                scheduler.workerMs += Number(process.hrtime.bigint() - start) / 1e6;
            });
        };
        self.terminate = function () {};
    };
}

function render(read, view) {
    const scheduler = newScheduler();
    const ctx = newContext();
    ctx.Worker = workerClass(read, scheduler);
    ["common.js", "events.js", "stopWatch.js", "tinycolor.js", "palette.js", "mandelbrotEscape.js",
        "messages/messages.js", "WebworkerBasedMandelbrotSet.js"].forEach((f) => run(ctx, read, "src/client/" + f));

    const hash = crypto.createHash("sha256");
    const escapeHash = crypto.createHash("sha256");
    const images = [];
    let frames = 0;
    let depth = 0;
    let modelMs = 0;
    ctx.modelFrameTime = function (escapeValues, step) {
        let active = 0;
        for (let p = 0; p < escapeValues.length; p += 1) if (escapeValues[p] === 0) active += 1;
        const ms = 2 + (step * active) / (parallelism * modelIterationsPerMs);
        modelMs += ms;
        return ms;
    };
    ctx.view = view.view;
    let harnessMs = 0;   // time spent here recording frames, left out of the main thread figure
    ctx.onFrame = function (imgData, escapeValues, iteration) {
        const recordStart = process.hrtime.bigint();
        hash.update(Buffer.from(imgData.buffer, imgData.byteOffset, imgData.byteLength));
        hash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
        escapeHash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
        images.push(new Uint8Array(imgData));
        harnessMs += Number(process.hrtime.bigint() - recordStart) / 1e6;
        frames += 1;
        depth = iteration;
        if (frames === view.switchAfter) {
            // Runs after the renderer has posted its next batch, before the workers handle it.
            scheduler.post(() => {
                ctx.view = view.switchTo;
                vm.runInContext("events.fire(events.extentsUpdate, jim.rectangle.create(view.x, view.y, view.w, view.h));", ctx);
            });
        }
        return frames >= view.frames;
    };

    // Mirrors the start-up order in mandelbrot.js.
    vm.runInContext(`
        var lastStep = 0;
        events.listenTo(events.histogramUpdateReceivedFromWorker, function (u) { lastStep = u.update.length; });
        jim.stopwatch.create = function () {
            return {start: function () {}, stop: function () {}, elapsed: function () {
                return modelFrameTime(escapeValues, lastStep);
            }};
        };
        var pixels = ${width * height};
        var imgData = new Uint8ClampedArray(pixels * 4);
        var escapeValues = new Uint32Array(pixels);
        var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var lastIteration = 0;
        events.listenTo(events.maxIterationsUpdated, function (i) { lastIteration = i; });
        jim.mandelbrot.escapeDistributionHistogram.create(events, new Uint32Array(jim.mandelbrot.initialHistogramSize));
        var calculator = jim.mandelbrot.webworkerInteractive.create(${width}, ${height}, events, 30, ${parallelism}, imgData,
            escapeValues, new Float64Array(pixels), new Float64Array(pixels), new Uint32Array(pixels), startingExtent);
        events.listenTo(events.frameComplete, function () {
            if (onFrame(imgData, escapeValues, lastIteration)) calculator.stop();
        });
        var palette = jim.palette.create(events);
        events.fire(events.paletteChanged, palette);
        events.fire(events.extentsUpdate, jim.rectangle.create(view.x, view.y, view.w, view.h));
        events.fire(events.paletteChanged, palette);
        calculator.start();
    `, ctx);

    const start = process.hrtime.bigint();
    scheduler.drain();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return {
        hash: hash.digest("hex").slice(0, 16), escapeHash: escapeHash.digest("hex"), images: images, frames: frames, depth: depth,
        workerMs: scheduler.workerMs, mainMs: ms - scheduler.workerMs - harnessMs, modelMs: modelMs,
        escapes: checkEscapes(ctx, read)
    };
}

// Recomputes the escape iteration of a sample of pixels from scratch and compares it with the
// renderer's escape values. A pixel that has escaped must have escaped at exactly the right
// iteration, and one that hasn't must not escape by the start of the last frame.
function checkEscapes(ctx, read) {
    run(ctx, read, "src/client/mandelbrotPoint.js");
    return vm.runInContext(`(function () {
        var point = jim.newMandelbrotPoint.create();
        var fragments = jim.messages.renderFragment2.create(0, view.x, view.y, view.w, view.h, ${width}, ${height}).split(${parallelism});
        var limit = lastIteration;
        for (var p = 0; p < escapeValues.length; p += 1) limit = Math.max(limit, escapeValues[p]);
        var result = {checked: 0, wrong: 0, firstWrong: null};
        fragments.forEach(function (fragment) {
            var e = fragment.extents;
            for (var p = 0; p < fragment.rows * fragment.columns; p += 13) {
                var i = p % fragment.columns;
                var j = Math.floor(p / fragment.columns);
                var expected = point.calculate(e.mx + (i * e.stepX), e.my + (j * e.stepY), limit, 0, 0, 0, 0).histogramEscapedAt;
                var actual = escapeValues[fragment.offset + p];
                var ok = actual !== 0 ? actual === expected : (expected === 0 || expected > lastIteration);
                result.checked += 1;
                if (!ok) {
                    result.wrong += 1;
                    result.firstWrong = result.firstWrong || {pixel: fragment.offset + p, expected: expected, actual: actual};
                }
            }
        });
        return result;
    })()`, ctx);
}

function describeEscapes(e) {
    return e.wrong === 0 ? "escapes ok" :
        "escapes WRONG " + e.wrong + "/" + e.checked + " (e.g. pixel " + e.firstWrong.pixel + ": expected " +
        e.firstWrong.expected + ", got " + e.firstWrong.actual + ")";
}

// Image export: the real histogram phase (escapeHistogramCalculator) followed by the image phase
// as set up by exportImage in export/exporter.js, which is mirrored here since the rest of that
// file is DOM handling. Returns a hash of the exported image.
function exportImage(read, exp) {
    const scheduler = newScheduler();
    const ctx = newContext();
    ctx.Worker = workerClass(read, scheduler);
    ["common.js", "events.js", "stopWatch.js", "tinycolor.js", "palette.js", "histogram.js", "messages/messages.js",
        "deadSectionSplitter.js", "export/exportHistogramCreator.js"].forEach((f) => run(ctx, read, "src/client/" + f));
    ctx.exp = exp;
    ctx.deadRegions = exp.deadRegions || [];
    let image;
    ctx.done = (imageData) => { image = imageData; };
    vm.runInContext(`
        var v = exp.view;
        var source = jim.rectangle.create(v.x, v.y, v.w, v.h);
        var dest = jim.rectangle.create(0, 0, Math.floor(exp.width / 10), Math.floor(exp.height / 10));
        jim.mandelbrot.export.escapeHistogramCalculator.create().calculate(source, dest, exp.depth, 10, 8, function (histogramData, histogramTotal) {
            var nodeList = jim.palette.create().toNodeList();
            var initialJobs = [];
            for (var i = 0; i < 8; i += 1) {
                var histoCopy = new Uint32Array(histogramData);
                initialJobs.push({workerMessageType: "imageexportworker", updateHistogramData: true, paletteNodes: nodeList,
                    histogramData: histoCopy.buffer, histogramSize: histoCopy.length, histogramTotal: histogramTotal});
            }
            var fragments = jim.messages.renderFragment2.create(0, v.x, v.y, v.w, v.h, exp.width, exp.height).split(100);
            var deadSections = jim.common.arraySplitter.create().split(deadRegions, 100, 700);
            var jobs = fragments.map(function (fragment, i) {
                // exporter.js passes the depth input's value, which is a string.
                return jim.messages.export.create(fragment, String(exp.depth), deadSections[i]);
            });
            var pool = jim.worker.pool.create(8, "/js/unifiedworker.js", initialJobs, "histogramData", "none");
            var imageData = new Uint8ClampedArray(exp.width * exp.height * 4);
            pool.consume(jobs, function (msg) {
                imageData.set(new Uint8ClampedArray(msg.result.imgData), msg.result.offset);
            }, function () {
                done(imageData);
            });
        });
    `, ctx);
    const start = process.hrtime.bigint();
    scheduler.drain();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return {
        hash: crypto.createHash("sha256").update(Buffer.from(image.buffer)).digest("hex").slice(0, 16), images: [new Uint8Array(image)],
        workerMs: scheduler.workerMs, mainMs: ms - scheduler.workerMs
    };
}

// A block of dead regions, in the 700x400 layout the interactive view publishes them in.
function deadRegionBlock() {
    const regions = new Uint32Array(700 * 400);
    for (let j = 100; j < 250; j += 1) for (let i = 200; i < 450; i += 1) regions[j * 700 + i] = 1;
    return regions;
}

const exportScenarios = [
    { name: "export default view", view: defaultView, width: 1400, height: 800, depth: 1000 },
    { name: "export period-3 bulb", view: bulbView, width: 700, height: 400, depth: 5000 },
    { name: "export with dead regions", view: defaultView, width: 1400, height: 800, depth: 1000, deadRegions: deadRegionBlock() }
];

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
// With --tolerance=N, output that differs only in colour, by at most N per channel, passes as CLOSE.
// Interactive escape values must still be identical.
const toleranceArg = process.argv.find((a) => a.startsWith("--tolerance="));
const tolerance = toleranceArg ? Number(toleranceArg.slice(12)) : null;

function compareImages(a, b) {
    let maxDiff = 0;
    let pixelsDiffering = 0;
    let pixels = 0;
    for (let f = 0; f < Math.min(a.length, b.length); f += 1) {
        for (let p = 0; p < a[f].length; p += 4) {
            let pixelDiff = 0;
            for (let c = 0; c < 4; c += 1) pixelDiff = Math.max(pixelDiff, Math.abs(a[f][p + c] - b[f][p + c]));
            if (pixelDiff) pixelsDiffering += 1;
            maxDiff = Math.max(maxDiff, pixelDiff);
            pixels += 1;
        }
    }
    return { maxDiff: maxDiff, percentDiffering: 100 * pixelsDiffering / pixels };
}

// SAME, CLOSE (within tolerance) or DIFFER, and whether that counts as a pass.
function verdict(results, escapesMatch) {
    if (results[0].hash === results[1].hash && results[0].frames === results[1].frames) return { label: "SAME   ", pass: true };
    if (tolerance === null || !escapesMatch || results[0].frames !== results[1].frames) return { label: "DIFFER ", pass: false };
    const c = compareImages(results[0].images, results[1].images);
    const detail = " [max channel difference " + c.maxDiff + ", " + c.percentDiffering.toFixed(3) + "% of pixels differ]";
    return c.maxDiff <= tolerance ? { label: "CLOSE  ", pass: true, detail: detail } : { label: "DIFFER ", pass: false, detail: detail };
}
const sides = [
    { label: ref, read: sourceReader(ref) },
    { label: "working tree", read: sourceReader(null) }
];
let failures = 0;
(only === "export" ? [] : views).forEach((view) => {
    const results = sides.map((side) => render(side.read, view));
    const v = verdict(results, results[0].escapeHash === results[1].escapeHash);
    if (!v.pass || results[1].escapes.wrong) failures += 1;
    console.log(v.label + view.name + " (" + results[1].frames + " frames)" + (v.detail || ""));
    results.forEach((r, i) => console.log("    " + sides[i].label.padEnd(14) + r.hash +
        "  depth " + String(r.depth).padStart(6) + "  model depth/s " + String(Math.round(r.depth / (r.modelMs / 1000))).padStart(7) +
        "  workers " + (r.workerMs / r.frames).toFixed(2).padStart(6) + " ms/frame" +
        "  main thread " + (r.mainMs / r.frames).toFixed(2).padStart(6) + " ms/frame  " + describeEscapes(r.escapes)));
});
(only === "interactive" ? [] : exportScenarios).forEach((exp) => {
    const results = sides.map((side) => exportImage(side.read, exp));
    const v = verdict(results, true);
    if (!v.pass) failures += 1;
    console.log(v.label + exp.name + " (" + exp.width + "x" + exp.height + ", depth " + exp.depth + ")" + (v.detail || ""));
    results.forEach((r, i) => console.log("    " + sides[i].label.padEnd(14) + r.hash +
        "  workers " + (r.workerMs / 1000).toFixed(2).padStart(7) + " s" +
        "  main thread " + (r.mainMs / 1000).toFixed(2).padStart(6) + " s"));
});
process.exit(failures ? 1 : 0);
