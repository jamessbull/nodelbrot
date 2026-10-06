namespace("jim.histogramexportworker");

// First phase of an image export: iterates a low-resolution sample of the image to the export depth
// and counts how many pixels escape at each iteration. histogramData[i] is the number that escaped at
// iteration i, for i from 1 to maxIterations - 1, and histogramTotal is the number that escaped at all.
jim.histogramexportworker.create = function () {
    "use strict";
    var onmessage = function (e) {
        var msg = e.data;
        var maxIterations = parseInt(msg.maxIterations, 10);
        var extents = {mx: msg.mx, my: msg.my, stepX: msg.mw, stepY: msg.mh};
        var pixels = jim.pixelIterator.create(msg.exportWidth, msg.exportHeight, extents);
        var histogramData = new Uint32Array(maxIterations + 1);
        pixels.iterate(0, maxIterations, histogramData);
        var reply = {
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
};
