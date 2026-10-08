import { createWorkerPool, workerCount } from "../workerPool.js";
import { renderFragments, exportMessage } from "../workerMessages.js";
import { lookupTableSize } from "../worker/pixelIterator.js";
import { binOf, binsFor } from "../histogramBins.js";
import { exportImage } from "./exportImage.js";

// Renders extents (a rectangle in the complex plane) as a width x height image, iterating to depth and
// coloured with palette, without touching the page. Workers made by newWorker() iterate the image in
// strips, sending back each pixel's escape iteration and smoothed escape iteration; the histogram of
// how many escape at each iteration is made from every pixel, as the GPU export's is (see gpuExport.js),
// to colour the image against, as the screen is. Calls onProgress("image", pixels) as each strip is
// done, then onComplete with the image (see exportImage.js), or onError with a message if a worker
// fails.
//
// For a view too deep for doubles, orbit is the reference orbit {generation, values, complete, loopTo}, worked out
// to at least depth + 2 values (or until it is complete), and extents is the area relative to its point:
// pixels are iterated by perturbation (see perturbationIterator.js).
export function renderExport({extents, width, height, depth, palette, newWorker, workers = workerCount(), orbit = null,
        onProgress = () => {}, onComplete, onError}) {
    const parts = 100;
    const pool = createWorkerPool(workers, newWorker);
    const smooth = new Float32Array(width * height);
    // Escapes by iteration (or bin of them: see histogramBins.js), cumulative once every strip is in.
    const counts = new Uint32Array(binsFor(depth) + 1);
    let total = 0;

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
        new Uint32Array(msg.result.escapes).forEach(function (escape) {
            if (escape !== 0 && escape <= depth) {
                counts[binOf(escape)] += 1;
                total += 1;
            }
        });
        smooth.set(new Float32Array(msg.result.smooth), at);
        onProgress("image", width * height / parts);
    }, function () {
        pool.terminate();
        for (let i = 1; i < counts.length; i += 1) {
            counts[i] += counts[i - 1];
        }
        onComplete(exportImage({width, height, smooth, counts, total, colours: palette.toLookupTable(lookupTableSize)}));
    }, fail);
}
