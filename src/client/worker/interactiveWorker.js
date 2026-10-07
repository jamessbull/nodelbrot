import { createPalette } from "../palette.js";
import { createPixelIterator, lookupTableSize } from "./pixelIterator.js";
import { createOrbitStore, createPerturbationIterator } from "./perturbationIterator.js";

// Computes the interactive view. Each message advances every pixel of this worker's fragment by
// msg.iterations iterations, then recolours the whole fragment against the latest histogram. Replies
// go to postMessage. A message with a new view (extents) starts the pixels again: by perturbation from
// the reference orbit if msg.perturbation is set, otherwise directly. Messages with orbit, a chunk of
// the reference orbit, add to this worker's copy of it, and get no reply.
export function createInteractiveWorker(postMessage) {
    const palette = createPalette();
    const orbit = createOrbitStore();
    let colours;
    let pixels;

    const onmessage = function (e) {
        const msg = e.data;
        if (msg.orbit) {
            orbit.add(msg.orbit.generation, msg.orbit.from, msg.orbit.values, msg.orbit.escaped);
            return;
        }
        const noOfPixels = msg.exportWidth * msg.exportHeight;
        const histogramUpdate = new Uint32Array(msg.iterations);
        const imageData = new Uint8ClampedArray(4 * noOfPixels);

        if (msg.extents) {
            pixels = msg.perturbation ? createPerturbationIterator(msg.exportWidth, msg.exportHeight, msg.extents, orbit)
                : createPixelIterator(msg.exportWidth, msg.exportHeight, msg.extents);
        }
        if (msg.paletteNodes) {
            palette.fromNodeList(msg.paletteNodes);
            palette.setBlend(msg.paletteBlend);
            colours = palette.toLookupTable(lookupTableSize);
        }

        pixels.iterate(msg.currentIteration, msg.iterations, histogramUpdate);
        const histogramData = new Uint32Array(msg.histogramDataBuffer);
        const histogramLength = msg.histogramLength === undefined ? histogramData.length : msg.histogramLength;
        pixels.colour(imageData, histogramData, histogramLength, msg.histogramTotal, colours);

        const escapeValuesToTransfer = new Uint32Array(pixels.escapeValues);
        const reply = {
            firstRow: msg.firstRow,
            rowStride: msg.rowStride,
            batchid: msg.batchid,
            histogramUpdate: histogramUpdate.buffer,
            imageDataBuffer: imageData.buffer,
            escapeValues: escapeValuesToTransfer.buffer,
            extraDataSent: false
        };
        if (msg.sendData) {
            reply.xState = pixels.xState;
            reply.yState = pixels.yState;
            reply.imageEscapeValues = pixels.imageEscapeValues;
            reply.extraDataSent = true;
        }
        postMessage(reply, [imageData.buffer, histogramUpdate.buffer, escapeValuesToTransfer.buffer]);
    };

    return {
        onmessage: onmessage
    };
}
