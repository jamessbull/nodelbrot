namespace("jim.pixelIterator");

// Iterates and colours a block of width x height pixels starting at extents.mx, extents.my, with
// extents.stepX and extents.stepY between pixels. Iteration can be done in steps: each call to
// iterate carries on from where the last one stopped. The per-pixel state lives in typed arrays
// and the loop works on them directly, without creating objects per pixel.
jim.pixelIterator.create = function (width, height, extents) {
    "use strict";
    var histogramEscapeValue = 16;
    var imageEscapeValue = 9007199254740991;
    var log = Math.log;
    var LN2 = Math.LN2;
    var floor = Math.floor;
    var inMainCardioidOrBulb = jim.newMandelbrotPoint.create().inMainCardioidOrBulb;
    var noOfPixels = width * height;
    var xState = new Float64Array(noOfPixels);
    var yState = new Float64Array(noOfPixels);
    var escapeValues = new Uint32Array(noOfPixels);        // iteration at which |z|^2 passed histogramEscapeValue, or 0
    var imageEscapeValues = new Uint32Array(noOfPixels);   // iteration at which |z|^2 passed imageEscapeValue, or 0
    var smoothIterations = new Float64Array(noOfPixels);   // smoothed escape iteration used for colouring, set once a pixel escapes
    var neverEscapes = new Uint8Array(noOfPixels);         // 1 once a pixel is known to be in the set, so needs no more iterating
    // Periodicity checking (Brent's method): each pixel keeps a reference point from its orbit,
    // replaced after periodWindow iterations, with the window doubling each time. If the orbit lands
    // exactly on the reference point it is in a cycle and will never escape. Exact equality means the
    // check can't change the result: the iteration as computed would repeat forever.
    var periodRefX = new Float64Array(noOfPixels);
    var periodRefY = new Float64Array(noOfPixels);
    var periodWindow = new Uint32Array(noOfPixels).fill(1);
    var periodCount = new Uint32Array(noOfPixels);          // iterations since the reference point was taken

    // Advances each pixel by noOfIterations iterations, numbered from startIteration + 1. Escapes past
    // histogramEscapeValue are counted in histogramUpdate, indexed by iteration - startIteration.
    // Pixels with a non-zero entry in skip, if given, are left alone.
    function iterate(startIteration, noOfIterations, histogramUpdate, skip) {
        var idx = 0;
        for (var j = 0; j < height; j += 1) {
            for (var i = 0; i < width; i += 1, idx += 1) {
                // histogramUpdate has one slot per iteration of this step, starting at startIteration, so
                // an escape on the last iteration of the previous step is counted here, in slot 0.
                if (startIteration !== 0 && escapeValues[idx] === startIteration) {
                    histogramUpdate[0] += 1;
                }
                if (imageEscapeValues[idx] !== 0 || neverEscapes[idx] !== 0) continue;
                if (skip && skip[idx] !== 0) continue;
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

    // Colours escaped pixels by their position in the cumulative escape histogram, and the rest black.
    // histogramData holds only the filled part of a histogram of histogramLength entries.
    function colour(imageData, histogramData, histogramLength, histogramTotal, palette) {
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

    function escapedCount() {
        var count = 0;
        for (var idx = 0; idx < noOfPixels; idx += 1) {
            if (escapeValues[idx] !== 0) count += 1;
        }
        return count;
    }

    return {
        iterate: iterate,
        colour: colour,
        escapedCount: escapedCount,
        xState: xState,
        yState: yState,
        escapeValues: escapeValues,
        imageEscapeValues: imageEscapeValues
    };
};
