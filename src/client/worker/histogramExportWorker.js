import { createPixelIterator } from "./pixelIterator.js";
import { createPerturbationIterator } from "./perturbationIterator.js";

// First phase of an image export: iterates a low-resolution sample of the image to the export depth
// and counts how many pixels escape at each iteration. histogramData[i] is the number that escaped at
// iteration i, for i from 1 to maxIterations - 1, and histogramTotal is the number that escaped at all.
// Replies go to postMessage. Deep views are iterated by perturbation from orbit, an orbit store.
export function createHistogramExportWorker(postMessage, orbit) {
    const onmessage = function (e) {
        const msg = e.data;
        const maxIterations = parseInt(msg.maxIterations, 10);
        const pixels = msg.perturbation ? createPerturbationIterator(msg.exportWidth, msg.exportHeight, msg.extents, orbit)
            : createPixelIterator(msg.exportWidth, msg.exportHeight, msg.extents);
        const histogramData = new Uint32Array(maxIterations + 1);
        pixels.iterate(0, maxIterations, histogramData);
        const reply = {
            batchid: msg.batchid,
            result: {
                histogramData: histogramData.buffer,
                histogramTotal: pixels.escapedCount()
            }
        };
        postMessage(reply, [histogramData.buffer]);
    };

    return {
        onmessage: onmessage
    };
}
