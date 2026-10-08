import { createWorkerPool, workerCount } from "../workerPool.js";
import { renderFragments, exportMessage } from "../workerMessages.js";
import { colourPixels, lookupTableSize } from "../worker/pixelIterator.js";
import { binOf, binsFor } from "../histogramBins.js";

// Renders extents (a rectangle in the complex plane) as a width x height image, iterating to depth and
// coloured with palette, without touching the page. Workers made by newWorker() iterate the image in
// strips, sending back each pixel's escape iteration and smoothed escape iteration; then the histogram
// of how many escape at each iteration is made from every pixel, as the GPU export's is (see
// gpuExport.js), and the image coloured against it, as the screen is. Calls onProgress("image", pixels)
// as each strip is done, then onComplete with the image's RGBA data, or onError with a message if a
// worker fails.
//
// For a view too deep for doubles, orbit is the reference orbit {generation, values, complete, loopTo}, worked out
// to at least depth + 2 values (or until it is complete), and extents is the area relative to its point:
// pixels are iterated by perturbation (see perturbationIterator.js).
export function renderExport({extents, width, height, depth, palette, newWorker, workers = workerCount(), orbit = null,
        onProgress = () => {}, onComplete, onError}) {
    const parts = 100;
    const pool = createWorkerPool(workers, newWorker);
    const escapes = new Uint32Array(width * height);
    const smooth = new Float32Array(width * height);

    function fail(message) {
        pool.terminate();
        if (onError) {
            onError(message);
        }
    }

    if (orbit) {
        pool.sendToEach(() => ({workerMessageType: "exportorbit", orbit}));
    }

    const jobs = renderFragments(extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height(), width, height)
        .split(parts).map((fragment) => Object.assign(exportMessage(fragment, depth), {perturbation: Boolean(orbit)}));
    pool.consume(jobs, function (msg) {
        // offset is in bytes of the RGBA image, four to a pixel.
        const at = msg.result.offset / 4;
        escapes.set(new Uint32Array(msg.result.escapes), at);
        smooth.set(new Float32Array(msg.result.smooth), at);
        onProgress("image", width * height / parts);
    }, function () {
        pool.terminate();
        // Cumulative counts, as colourPixels wants them: how many pixels had escaped by each iteration
        // (or bin of them: see histogramBins.js).
        const counts = new Uint32Array(binsFor(depth) + 1);
        let total = 0;
        for (let idx = 0; idx < escapes.length; idx += 1) {
            if (escapes[idx] !== 0 && escapes[idx] <= depth) {
                counts[binOf(escapes[idx])] += 1;
                total += 1;
            }
        }
        for (let i = 1; i < counts.length; i += 1) {
            counts[i] += counts[i - 1];
        }
        const image = new Uint8ClampedArray(width * height * 4);
        colourPixels(image, smooth, smooth, counts, counts.length, total, palette.toLookupTable(lookupTableSize));
        onComplete(image);
    }, fail);
}
