import { createPalette } from "../palette.js";
import { createPixelIterator, lookupTableSize } from "./pixelIterator.js";

// Second phase of an image export: iterates one strip of the full-size image to the export depth and
// colours it against the histogram from the first phase. The histogram and palette arrive in a message
// with updateHistogramData set, sent once to each worker before any strips. Replies go to postMessage.
export function createImageExportWorker(postMessage) {
    const palette = createPalette();
    let colours;
    let histogramData;
    let histogramTotal;
    let escapeCounts;

    // A strip is iterated and coloured a row at a time, so the iterator's per-pixel state (57 bytes a
    // pixel) is only ever held for one row rather than the whole strip. Each pixel is worked out
    // exactly as it would be in one go.
    function exportStrip(msg) {
        const width = msg.exportWidth;
        const height = msg.exportHeight;
        const maxIterations = parseInt(msg.maxIterations, 10);
        // The iterator counts escapes per iteration, which an export doesn't use, into an array as
        // long as the depth. It is made once per depth and reused.
        if (!escapeCounts || escapeCounts.length !== maxIterations + 1) {
            escapeCounts = new Uint32Array(maxIterations + 1);
        }
        const imageData = new Uint8ClampedArray(width * height * 4);
        const rowBytes = width * 4;
        for (let j = 0; j < height; j += 1) {
            const rowExtents = Object.assign({}, msg.extents, {firstRow: msg.extents.firstRow + (j * msg.extents.rowStride)});
            const row = createPixelIterator(width, 1, rowExtents);
            row.iterate(0, maxIterations, escapeCounts);
            row.colour(imageData.subarray(j * rowBytes, (j + 1) * rowBytes), histogramData, histogramData.length, histogramTotal, colours);
        }
        const reply = {
            batchid: msg.batchid,
            result: {imgData: imageData.buffer, offset: msg.offset}
        };
        postMessage(reply, [imageData.buffer]);
    }

    const onmessage = function (e) {
        const msg = e.data;
        if (msg.updateHistogramData) {
            histogramData = new Uint32Array(msg.histogramData);
            histogramTotal = msg.histogramTotal;
            palette.fromNodeList(msg.paletteNodes);
            palette.setBlend(msg.paletteBlend);
            colours = palette.toLookupTable(lookupTableSize);
        } else {
            exportStrip(msg);
        }
    };

    return {
        onmessage: onmessage
    };
}
