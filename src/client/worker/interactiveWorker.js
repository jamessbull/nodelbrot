import { createPalette } from "../palette.js";
import { createPixelIterator, lookupTableSize } from "./pixelIterator.js";

// Computes the interactive view. Each message advances every pixel of this worker's fragment by
// msg.iterations iterations, then recolours the whole fragment against the latest histogram. Replies
// go to postMessage.
export function createInteractiveWorker(postMessage) {
    const palette = createPalette();
    let colours;
    let pixels;

    const onmessage = function (e) {
        const msg = e.data;
        const noOfPixels = msg.exportWidth * msg.exportHeight;
        const histogramUpdate = new Uint32Array(msg.iterations);
        const imageData = new Uint8ClampedArray(4 * noOfPixels);

        if (msg.extents) {
            pixels = createPixelIterator(msg.exportWidth, msg.exportHeight, msg.extents);
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
