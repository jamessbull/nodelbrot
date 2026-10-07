import { createWorkerPool, workerCount } from "../workerPool.js";
import { renderFragments, exportMessage } from "../workerMessages.js";

// Renders extents (a rectangle in the complex plane) as a width x height image, iterating to depth and
// coloured with palette, without touching the page. Two phases run on one pool of workers, made by
// newWorker(): first a histogram of how many pixels escape at each iteration, from a sample of the image
// at a tenth of its size each way, then the image itself in strips, coloured against that histogram.
// Calls onProgress("histogram" or "image", pixels) as each part of a phase is done, then onComplete with
// the image's RGBA data, or onError with a message if a worker fails.
//
// For a view too deep for doubles, orbit is the reference orbit {generation, values, complete}, worked out
// to at least depth + 2 values (or until it is complete), and extents is the area relative to its point:
// pixels are iterated by perturbation (see perturbationIterator.js).
export function renderExport({extents, width, height, depth, palette, newWorker, workers = workerCount(), orbit = null,
        onProgress = () => {}, onComplete, onError}) {
    const histogramParts = 10;
    const imageParts = 100;
    const pool = createWorkerPool(workers, newWorker);

    function fail(message) {
        pool.terminate();
        if (onError) {
            onError(message);
        }
    }

    function fragments(columns, rows, parts) {
        return renderFragments(extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height(), columns, rows).split(parts);
    }

    if (orbit) {
        pool.sendToEach(() => ({workerMessageType: "exportorbit", orbit}));
    }

    function histogramPhase(onHistogram) {
        const sampleWidth = Math.floor(width / 10);
        const sampleHeight = Math.floor(height / 10);
        const histogram = new Uint32Array(depth + 1);
        let total = 0;
        const jobs = fragments(sampleWidth, sampleHeight, histogramParts).map((fragment) => ({
            workerMessageType: "histogramexportworker",
            maxIterations: depth,
            exportWidth: fragment.columns,
            exportHeight: fragment.rows,
            extents: fragment.extents,
            perturbation: Boolean(orbit)
        }));
        pool.consume(jobs, function (msg) {
            const counts = new Uint32Array(msg.result.histogramData);
            for (let i = 1; i < counts.length; i += 1) {
                histogram[i] += counts[i];
            }
            total += msg.result.histogramTotal;
            onProgress("histogram", sampleWidth * sampleHeight / histogramParts);
        }, function () {
            // The image phase needs cumulative counts: how many pixels had escaped by each iteration.
            for (let i = 1; i < histogram.length; i += 1) {
                histogram[i] += histogram[i - 1];
            }
            onHistogram(histogram, total);
        }, fail);
    }

    function imagePhase(histogram, total) {
        const nodes = palette.toNodeList();
        const blend = palette.blend();
        pool.sendToEach(function () {
            const histogramData = new Uint32Array(histogram).buffer;
            return {workerMessageType: "imageexportworker", updateHistogramData: true, paletteNodes: nodes, paletteBlend: blend,
                histogramData: histogramData, histogramTotal: total, transfer: [histogramData]};
        });
        const jobs = fragments(width, height, imageParts).map((fragment) => Object.assign(exportMessage(fragment, depth), {perturbation: Boolean(orbit)}));
        const image = new Uint8ClampedArray(width * height * 4);
        pool.consume(jobs, function (msg) {
            image.set(new Uint8ClampedArray(msg.result.imgData), msg.result.offset);
            onProgress("image", width * height / imageParts);
        }, function () {
            pool.terminate();
            onComplete(image);
        }, fail);
    }

    histogramPhase(imagePhase);
}
