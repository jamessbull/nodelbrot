import { createPixelIterator } from "./pixelIterator.js";
import { createPerturbationIterator } from "./perturbationIterator.js";

// An image export's work: iterates one strip of the image to the export depth and sends back each
// pixel's escape iteration (or 0) and smoothed image escape iteration (or 0, if it hasn't escaped), for
// the histogram and colouring, which are done once every strip is in (see exportRenderer.js). Replies go
// to postMessage. Deep views are iterated by perturbation from orbit, an orbit store.
export function createImageExportWorker(postMessage, orbit) {
    let escapeCounts;

    // A strip is iterated a row at a time, so the iterator's per-pixel state is only ever held for one
    // row rather than the whole strip. Each pixel is worked out exactly as it would be in one go.
    function exportStrip(msg) {
        const width = msg.exportWidth;
        const height = msg.exportHeight;
        const maxIterations = parseInt(msg.maxIterations, 10);
        // The iterator counts escapes per iteration, which isn't wanted here, into an array as long as
        // the depth. It is made once per depth and reused.
        if (!escapeCounts || escapeCounts.length !== maxIterations + 1) {
            escapeCounts = new Uint32Array(maxIterations + 1);
        }
        const escapes = new Uint32Array(width * height);
        const smooth = new Float32Array(width * height);
        for (let j = 0; j < height; j += 1) {
            const rowExtents = Object.assign({}, msg.extents, {firstRow: msg.extents.firstRow + (j * msg.extents.rowStride)});
            const row = msg.perturbation ? createPerturbationIterator(width, 1, rowExtents, orbit) : createPixelIterator(width, 1, rowExtents);
            row.iterate(0, maxIterations, escapeCounts);
            escapes.set(row.escapeValues, j * width);
            for (let i = 0; i < width; i += 1) {
                smooth[(j * width) + i] = row.imageEscapeValues[i] === 0 ? 0 : row.smoothIterations[i];
            }
        }
        postMessage({batchid: msg.batchid, result: {escapes: escapes.buffer, smooth: smooth.buffer, offset: msg.offset}},
            [escapes.buffer, smooth.buffer]);
    }

    return {
        onmessage: (e) => exportStrip(e.data)
    };
}
