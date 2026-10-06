// Checks that the interactive render pipeline produces exactly the same output as another revision.
//
//   node dev/workerCheck.js [git-ref]      (default ref: HEAD)
//
// Runs the real main-thread code (webworkerInteractive, the worker pool, histogram bookkeeping) and
// the real worker code (unifiedworker.js) in Node, with an in-process stand-in for Worker, for a
// fixed number of frames on a few views. Every frame's image and escape values are hashed, so any
// difference in output between the working tree and the ref shows up as a hash mismatch.
// The step size is made deterministic by giving the renderer a fake stopwatch.
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
const ref = process.argv[2] || "HEAD";
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

// Elapsed frame times fed to the renderer's step-size adjustment, cycled. Mixes slow, fast and
// in-between frames so the step size moves up and down.
const fakeFrameTimes = [50, 20, 20, 35, 45, 20, 10, 60, 25, 38];

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
    let frames = 0;
    let depth = 0;
    ctx.fakeFrameTimes = fakeFrameTimes;
    ctx.view = view.view;
    ctx.onFrame = function (imgData, escapeValues, iteration) {
        hash.update(Buffer.from(imgData.buffer, imgData.byteOffset, imgData.byteLength));
        hash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
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
        var frameNo = 0;
        jim.stopwatch.create = function () {
            return {start: function () {}, stop: function () {}, elapsed: function () {
                return fakeFrameTimes[frameNo++ % fakeFrameTimes.length];
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
        calculator.start();
        var palette = jim.palette.create(events);
        events.fire(events.paletteChanged, palette);
        events.fire(events.extentsUpdate, jim.rectangle.create(view.x, view.y, view.w, view.h));
        events.fire(events.paletteChanged, palette);
    `, ctx);

    const start = process.hrtime.bigint();
    scheduler.drain();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return {
        hash: hash.digest("hex").slice(0, 16), frames: frames, depth: depth,
        workerMs: scheduler.workerMs, mainMs: ms - scheduler.workerMs,
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

const sides = [
    { label: ref, read: sourceReader(ref) },
    { label: "working tree", read: sourceReader(null) }
];
let failures = 0;
views.forEach((view) => {
    const results = sides.map((side) => render(side.read, view));
    const same = results[0].hash === results[1].hash && results[0].frames === results[1].frames;
    if (!same || results[1].escapes.wrong) failures += 1;
    console.log((same ? "SAME   " : "DIFFER ") + view.name + " (" + results[1].frames + " frames)");
    results.forEach((r, i) => console.log("    " + sides[i].label.padEnd(14) + r.hash +
        "  depth " + String(r.depth).padStart(6) +
        "  workers " + (r.workerMs / r.frames).toFixed(2).padStart(6) + " ms/frame" +
        "  main thread " + (r.mainMs / r.frames).toFixed(2).padStart(6) + " ms/frame  " + describeEscapes(r.escapes)));
});
process.exit(failures ? 1 : 0);
