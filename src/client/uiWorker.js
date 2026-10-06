namespace("jim.uiWorker");

// Computes the interactive view. Each message advances every pixel of this worker's fragment by
// msg.iterations iterations, then recolours the whole fragment against the latest histogram.
jim.uiWorker.create = function () {
    "use strict";
    var palette = jim.palette.create();
    var pixels;

    var onmessage = function (e) {
        var msg = e.data;
        var noOfPixels = msg.exportWidth * msg.exportHeight;
        var histogramUpdate = new Uint32Array(msg.iterations);
        var imageData = new Uint8ClampedArray(4 * noOfPixels);

        if (msg.extents) {
            pixels = jim.pixelIterator.create(msg.exportWidth, msg.exportHeight, msg.extents);
        }
        if (msg.paletteNodes) {
            palette.fromNodeList(msg.paletteNodes);
        }

        pixels.iterate(msg.currentIteration, msg.iterations, histogramUpdate);
        var histogramData = new Uint32Array(msg.histogramDataBuffer);
        var histogramLength = msg.histogramLength === undefined ? histogramData.length : msg.histogramLength;
        pixels.colour(imageData, histogramData, histogramLength, msg.histogramTotal, palette);

        var escapeValuesToTransfer = new Uint32Array(pixels.escapeValues);
        var reply = {
            offset: msg.offset,
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
};
