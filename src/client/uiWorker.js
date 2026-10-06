namespace("jim.uiWorker");

// Computes the interactive view. Each message advances every pixel of this worker's fragment by
// msg.iterations iterations, then recolours the whole fragment against the latest histogram.
// The per-pixel state lives in typed arrays and the loop works on them directly, without
// creating objects per pixel.
jim.uiWorker.create = function () {
    "use strict";
    var histogramEscapeValue = 16;
    var imageEscapeValue = 9007199254740991;
    var log = Math.log;
    var LN2 = Math.LN2;
    var floor = Math.floor;
    var inMainCardioidOrBulb = jim.newMandelbrotPoint.create().inMainCardioidOrBulb;
    var palette = jim.palette.create();
    var extents;
    var xState;
    var yState;
    var escapeValues;           // iteration at which |z|^2 passed histogramEscapeValue, or 0
    var imageEscapeValues;      // iteration at which |z|^2 passed imageEscapeValue, or 0
    var smoothIterations;       // smoothed escape iteration used for colouring, set once a pixel escapes
    var neverEscapes;           // 1 once a pixel is known to be in the set, so needs no more iterating
    // Periodicity checking (Brent's method): each pixel keeps a reference point from its orbit,
    // replaced after periodWindow iterations, with the window doubling each time. If the orbit lands
    // exactly on the reference point it is in a cycle and will never escape. Exact equality means the
    // check can't change the result: the iteration as computed would repeat forever.
    var periodRefX;
    var periodRefY;
    var periodWindow;
    var periodCount;            // iterations since the reference point was taken

    function initState(noOfPixels) {
        xState = new Float64Array(noOfPixels);
        yState = new Float64Array(noOfPixels);
        escapeValues = new Uint32Array(noOfPixels);
        imageEscapeValues = new Uint32Array(noOfPixels);
        smoothIterations = new Float64Array(noOfPixels);
        neverEscapes = new Uint8Array(noOfPixels);
        periodRefX = new Float64Array(noOfPixels);
        periodRefY = new Float64Array(noOfPixels);
        periodWindow = new Uint32Array(noOfPixels).fill(1);
        periodCount = new Uint32Array(noOfPixels);
    }

    function iterate(width, height, startIteration, noOfIterations, histogramUpdate) {
        var idx = 0;
        for (var j = 0; j < height; j += 1) {
            for (var i = 0; i < width; i += 1, idx += 1) {
                // histogramUpdate has one slot per iteration of this frame, starting at startIteration, so
                // an escape on the last iteration of the previous frame is counted here, in slot 0.
                if (startIteration !== 0 && escapeValues[idx] === startIteration) {
                    histogramUpdate[0] += 1;
                }
                if (imageEscapeValues[idx] !== 0 || neverEscapes[idx] !== 0) continue;
                var mx = extents.mx + (i * extents.stepX);
                var my = extents.my + (j * extents.stepY);
                if (inMainCardioidOrBulb(mx, my)) {
                    neverEscapes[idx] = 1;
                    continue;
                }

                var x = xState[idx];
                var y = yState[idx];
                var histogramEscapedAt = escapeValues[idx];
                var refX = periodRefX[idx];
                var refY = periodRefY[idx];
                var window = periodWindow[idx];
                var sinceRef = periodCount[idx];
                var n = 0;
                var xSquared, ySquared, xSquaredPlusYSquared;
                while (n < noOfIterations) {
                    xSquared = x * x;
                    ySquared = y * y;
                    xSquaredPlusYSquared = xSquared + ySquared;
                    n += 1;
                    if (xSquaredPlusYSquared < imageEscapeValue) {
                        y = ((x * y) * 2) + my;
                        x = xSquared - ySquared + mx;
                    }
                    if (histogramEscapedAt === 0 && xSquaredPlusYSquared > histogramEscapeValue) {
                        histogramEscapedAt = startIteration + n;
                        if (n < noOfIterations) {
                            histogramUpdate[n] += 1;
                        }
                    }
                    if (xSquaredPlusYSquared > imageEscapeValue) {
                        imageEscapeValues[idx] = startIteration + n;
                        smoothIterations[idx] = startIteration + n + 1 - log(log(x * x + y * y) / 2 / LN2) / LN2;
                        break;
                    }
                    if (x === refX && y === refY) {
                        neverEscapes[idx] = 1;
                        break;
                    }
                    sinceRef += 1;
                    if (sinceRef === window) {
                        sinceRef = 0;
                        window *= 2;
                        refX = x;
                        refY = y;
                    }
                }
                xState[idx] = x;
                yState[idx] = y;
                escapeValues[idx] = histogramEscapedAt;
                periodRefX[idx] = refX;
                periodRefY[idx] = refY;
                periodWindow[idx] = window;
                periodCount[idx] = sinceRef;
            }
        }
    }

    // histogramData holds only the filled part of a histogram of histogramLength entries.
    function colour(noOfPixels, imageData, histogramData, histogramLength, histogramTotal) {
        function percentEscapedBy(iteration) {
            var no = histogramData[iteration];
            if (no === undefined) {
                // Unfilled entries are zero; past the end of the histogram everything has escaped.
                return iteration >= histogramData.length && iteration < histogramLength ? 0 : 1;
            }
            return no === 0 ? 0 : no / histogramTotal;
        }

        for (var idx = 0, rgbaIdx = 0; idx < noOfPixels; idx += 1, rgbaIdx += 4) {
            if (imageEscapeValues[idx] === 0) {
                imageData[rgbaIdx] = 0;
                imageData[rgbaIdx + 1] = 0;
                imageData[rgbaIdx + 2] = 0;
            } else {
                var iteration = smoothIterations[idx];
                var iterationFloor = floor(iteration);
                var lower = percentEscapedBy(iterationFloor);
                var higher = percentEscapedBy(iterationFloor + 1);
                var pixelColour = palette.colourAt(lower + ((higher - lower) * (iteration % 1)));
                imageData[rgbaIdx] = pixelColour.r;
                imageData[rgbaIdx + 1] = pixelColour.g;
                imageData[rgbaIdx + 2] = pixelColour.b;
            }
            imageData[rgbaIdx + 3] = 255;
        }
    }

    var onmessage = function (e) {
        var msg = e.data;
        var width = msg.exportWidth;
        var noOfPixels = width * msg.exportHeight;
        var histogramUpdate = new Uint32Array(msg.iterations);
        var imageData = new Uint8ClampedArray(4 * noOfPixels);

        if (!xState || msg.extents) {
            initState(noOfPixels);
        }
        if (msg.extents) {
            extents = msg.extents;
        }
        if (msg.paletteNodes) {
            palette.fromNodeList(msg.paletteNodes);
        }

        iterate(width, msg.exportHeight, msg.currentIteration, msg.iterations, histogramUpdate);
        var histogramData = new Uint32Array(msg.histogramDataBuffer);
        var histogramLength = msg.histogramLength === undefined ? histogramData.length : msg.histogramLength;
        colour(noOfPixels, imageData, histogramData, histogramLength, msg.histogramTotal);

        var escapeValuesToTransfer = new Uint32Array(escapeValues);
        var reply = {
            offset: msg.offset,
            batchid: msg.batchid,
            histogramUpdate: histogramUpdate.buffer,
            imageDataBuffer: imageData.buffer,
            escapeValues: escapeValuesToTransfer.buffer,
            extraDataSent: false
        };
        if (msg.sendData) {
            reply.xState = xState;
            reply.yState = yState;
            reply.imageEscapeValues = imageEscapeValues;
            reply.extraDataSent = true;
        }
        postMessage(reply, [imageData.buffer, histogramUpdate.buffer, escapeValuesToTransfer.buffer]);
    };

    return {
        onmessage: onmessage
    };
};
