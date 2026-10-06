namespace("jim.imageexportworker");

// Second phase of an image export: iterates one strip of the full-size image to the export depth and
// colours it against the histogram from the first phase. The histogram and palette arrive in a message
// with updateHistogramData set, sent once to each worker before any strips.
jim.imageexportworker.create = function () {
    "use strict";
    var palette = jim.palette.create();
    var histogramData;
    var histogramTotal;

    // Dead regions are laid out 700 pixels wide, as in the interactive view, so each covers a block
    // of width / 700 pixels each way in the export.
    function deadRegionMask(deadRegions, width, height) {
        var floor = Math.floor;
        var scale = width / 700;
        var mask = new Uint8Array(width * height);
        for (var j = 0, idx = 0; j < height; j += 1) {
            for (var i = 0; i < width; i += 1, idx += 1) {
                mask[idx] = deadRegions[(floor(j / scale) * 700) + floor(i / scale)] ? 1 : 0;
            }
        }
        return mask;
    }

    function exportStrip(msg) {
        var width = msg.exportWidth;
        var height = msg.exportHeight;
        var maxIterations = parseInt(msg.maxIterations, 10);
        var pixels = jim.pixelIterator.create(width, height, msg.extents);
        var skip = msg.deadRegions ? deadRegionMask(msg.deadRegions, width, height) : undefined;
        pixels.iterate(0, maxIterations, new Uint32Array(maxIterations + 1), skip);
        var imageData = new Uint8ClampedArray(width * height * 4);
        pixels.colour(imageData, histogramData, histogramData.length, histogramTotal, palette);
        var reply = {
            batchid: msg.batchid,
            result: {imgData: imageData.buffer, offset: msg.offset}
        };
        postMessage(reply, [imageData.buffer]);
    }

    var onmessage = function (e) {
        var msg = e.data;
        if (msg.updateHistogramData) {
            histogramData = new Uint32Array(msg.histogramData);
            histogramTotal = msg.histogramTotal;
            palette.fromNodeList(msg.paletteNodes);
        } else {
            exportStrip(msg);
        }
    };

    return {
        onmessage: onmessage
    };
};
