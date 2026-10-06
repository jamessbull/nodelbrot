// Checks that the interactive render pipeline produces exactly the same output as another revision.
//
//   node dev/workerCheck.js [git-ref]      (default ref: HEAD)
//
// Runs the real main-thread code (webworkerInteractive, the worker pool, histogram bookkeeping) and
// the real worker code (unifiedworker.js) in Node, with an in-process stand-in for Worker, for a
// fixed number of frames on a few views. Every frame's image and escape values are hashed, so any
// difference in output between the working tree and the ref shows up as a hash mismatch.
// The step size is made deterministic by giving the renderer a fake stopwatch.
// Exits with status 1 if any view differs.
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

const views = [
    { name: "default", frames: 60, x: -2.5, y: -1, w: 3.5, h: 2 },
    { name: "period-3 bulb", frames: 60, x: -0.35, y: 0.55, w: 0.45, h: 0.2571 },
    { name: "deep", frames: 40, x: -0.74364, y: 0.13182, w: 0.00003, h: 0.0000171 }
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
            scheduler.post(() => vm.runInContext("onmessage", ctx)({ data: copy }));
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
    ctx.view = view;
    ctx.onFrame = function (imgData, escapeValues, iteration) {
        hash.update(Buffer.from(imgData.buffer, imgData.byteOffset, imgData.byteLength));
        hash.update(Buffer.from(escapeValues.buffer, escapeValues.byteOffset, escapeValues.byteLength));
        frames += 1;
        depth = iteration;
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
    return { hash: hash.digest("hex").slice(0, 16), frames: frames, depth: depth, ms: ms };
}

const sides = [
    { label: ref, read: sourceReader(ref) },
    { label: "working tree", read: sourceReader(null) }
];
let mismatches = 0;
views.forEach((view) => {
    const results = sides.map((side) => render(side.read, view));
    const same = results[0].hash === results[1].hash && results[0].frames === results[1].frames;
    if (!same) mismatches += 1;
    console.log((same ? "SAME   " : "DIFFER ") + view.name + " (" + results[1].frames + " frames, depth " + results[1].depth + ")");
    results.forEach((r, i) => console.log("    " + sides[i].label.padEnd(14) + r.hash + "  " + r.ms.toFixed(0).padStart(6) + " ms"));
});
process.exit(mismatches ? 1 : 0);
