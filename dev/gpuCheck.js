// Renders views with the GPU renderer and the CPU renderer to the same depth and compares their escape
// counts pixel by pixel. Run it from the dev server: /dev/gpuCheck.html. Results also go in window.results.
import * as api from "/client/main.js";

const width = 400;
const height = 240;
const depth = 20000;
const views = [
    ["whole set", "-0.75", "0", 0.0125],
    // The centre escapes early but much of the view is in the set, so the GPU renderer re-references.
    ["cardioid cusp", "0.2501", "0", 1e-5],
    ["seahorse valley 1e-6", "-0.743643887037158704752191506114774", "0.131825904205311970493132056385139", 1e-6],
    ["seahorse valley 1e-12", "-0.743643887037158704752191506114774", "0.131825904205311970493132056385139", 1e-12],
    ["seahorse valley 1e-20", "-0.743643887037158704752191506114774", "0.131825904205311970493132056385139", 1e-20],
    ["spiral 1e-28", "-0.74364388703715869775210999909999300008", "0.13182590420531197349300999970000399993", 1e-28]
];

const newWorker = () => new Worker("/client/main.js", { type: "module" });

// Renders the view with one renderer until it reaches the depth, resolving with its escape counts.
function render(kind, view) {
    return new Promise(function (resolve, reject) {
        const events = api.createEvents();
        const pixels = width * height;
        const escapeValues = new Uint32Array(pixels);
        const imgData = new Uint8ClampedArray(pixels * 4);
        // The CPU renderer only uses a reference orbit where doubles run out, from the view's centre; the GPU
        // always does, from a nucleus where there is one, as in the explorer. So each checks the other.
        const referenceOrbit = kind === "gpu" ? api.createReferenceOrbit({ events, newWorker, needed: () => true, searchRadius: 1000 })
            : api.createReferenceOrbit({ events, newWorker });
        api.createEscapeHistogram(events, new Uint32Array(api.initialHistogramSize));
        const options = {
            width, height, events, imgData, escapeValues, xState: new Float64Array(pixels),
            yState: new Float64Array(pixels), imageEscapeValues: new Uint32Array(pixels), referenceOrbit
        };
        const renderer = kind === "gpu" ? api.createGpuRenderer(options)
            : api.createInteractiveRenderer(Object.assign({ workers: api.workerCount(), newWorker }, options));
        const started = performance.now();
        let reached = 0;
        let examining = false;
        events.listenTo(events.depthReached, (d) => { reached = d; });
        // Once deep enough, stops and fetches the pixels as the examine panel does (the GPU renderer only
        // copies them back for that), which takes one more frame.
        events.listenTo(events.frameComplete, function () {
            if (reached >= depth && !examining) {
                examining = true;
                renderer.stop();
                events.fire(events.startExamining);
            }
        });
        events.listenTo(events.pixelDataReady, function () {
            renderer.destroy();
            referenceOrbit.dispose();
            resolve({ escapeValues, imgData, depth: reached, seconds: (performance.now() - started) / 1000 });
        });
        events.listenTo(events.stop, () => reached < depth && reject(new Error(kind + " renderer stopped")));
        events.fire(events.paletteChanged, api.createPalette());
        events.fire(events.viewChanged, view);
        renderer.start();
    });
}

function compare(gpu, cpu) {
    // Only escapes both renderers had the chance to see.
    const limit = Math.min(gpu.depth, cpu.depth);
    let gpuEscaped = 0, cpuEscaped = 0, both = 0, same = 0, close = 0;
    for (let p = 0; p < gpu.escapeValues.length; p += 1) {
        const g = gpu.escapeValues[p] <= limit ? gpu.escapeValues[p] : 0;
        const c = cpu.escapeValues[p] <= limit ? cpu.escapeValues[p] : 0;
        if (g) gpuEscaped += 1;
        if (c) cpuEscaped += 1;
        if (g === c) same += 1;
        if (g === c || (g && c && Math.abs(g - c) <= 0.01 * c)) close += 1;
        if (g && c) both += 1;
    }
    const pixels = gpu.escapeValues.length;
    // Of the pixels with the same escape count, the share coloured differently (by more than 8 in a channel),
    // and of all pixels, the share different enough to see (more than 24).
    let sameCount = 0, colourDiffers = 0, visible = 0;
    for (let p = 0; p < pixels; p += 1) {
        let difference = 0;
        for (let c = 0; c < 3; c += 1) difference = Math.max(difference, Math.abs(gpu.imgData[(4 * p) + c] - cpu.imgData[(4 * p) + c]));
        if (difference > 24) visible += 1;
        if (gpu.escapeValues[p] && gpu.escapeValues[p] === cpu.escapeValues[p]) {
            sameCount += 1;
            let diff = 0;
            for (let c = 0; c < 3; c += 1) diff = Math.max(diff, Math.abs(gpu.imgData[(4 * p) + c] - cpu.imgData[(4 * p) + c]));
            if (diff > 8) colourDiffers += 1;
        }
    }
    return { limit, gpuEscaped, cpuEscaped, same: same / pixels, close: close / pixels, both, colourDiffers: colourDiffers / Math.max(1, sameCount), visible: visible / pixels };
}

const table = document.getElementById("results");
window.results = [];
(async function () {
    if (!api.gpuAvailable()) {
        document.getElementById("status").textContent = "This browser can't run the GPU renderer.";
        return;
    }
    for (const [name, x, y, pixelSize] of views) {
        const view = api.viewAt(x, y, pixelSize);
        const gpu = await render("gpu", view);
        const cpu = await render("cpu", view);
        const result = Object.assign({ name, pixelSize, gpuSeconds: gpu.seconds, cpuSeconds: cpu.seconds }, compare(gpu, cpu));
        window.results.push(result);
        const row = table.insertRow();
        // Escape counts of pixels on the boundary change when the pixel is moved by a tiny fraction of
        // itself (3e-5 of a pixel is enough for about 1 in 100), which is what 32-bit rounding amounts
        // to, so a few percent differing is to be expected; more would be a problem.
        const pass = result.close >= 0.93;
        [name, pixelSize.toExponential(0), result.limit, result.gpuEscaped + " / " + result.cpuEscaped,
            (100 * result.same).toFixed(1) + "%", (100 * result.close).toFixed(1) + "%", (100 * result.visible).toFixed(1) + "%",
            result.gpuSeconds.toFixed(2) + "s / " + result.cpuSeconds.toFixed(2) + "s"].forEach(function (text, i) {
            const cell = row.insertCell();
            cell.textContent = text;
            if (i === 6) cell.className = pass ? "pass" : "fail";
        });
    }
    document.getElementById("status").textContent = "Done.";
})().catch(function (e) {
    document.getElementById("status").textContent = "Failed: " + e.message;
    window.results.push({ error: e.message });
});
