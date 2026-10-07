namespace("jim.pixelIterator");

// Number of entries in the palette lookup table used for colouring. With 16384 entries a colour is
// at most one shade out on palettes whose colours are at least about 1% apart.
jim.pixelIterator.lookupTableSize = 16384;

// Iterates and colours width x height pixels: rows extents.firstRow, then every extents.rowStride-th row,
// of an image whose top left pixel is at extents.mx, extents.my, with extents.stepX and extents.stepY
// between pixels. Iteration can be done in steps: each call to
// iterate carries on from where the last one stopped. The per-pixel state lives in typed arrays
// and the loop works on them directly, without creating objects per pixel.
jim.pixelIterator.create = function (width, height, extents) {
    "use strict";
    var histogramEscapeValue = 16;
    var imageEscapeValue = 9007199254740991;
    var log = Math.log;
    var LN2 = Math.LN2;
    var floor = Math.floor;
    var black = new Uint32Array(new Uint8ClampedArray([0, 0, 0, 255]).buffer)[0];
    var inMainCardioidOrBulb = jim.newMandelbrotPoint.create().inMainCardioidOrBulb;
    var noOfPixels = width * height;
    var firstRow = extents.firstRow;
    var rowStride = extents.rowStride;
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
                var my = extents.my + ((firstRow + (j * rowStride)) * extents.stepY);
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
    // colours is a palette lookup table from palette.toLookupTable; the nearest entry is used.
    function colour(imageData, histogramData, histogramLength, histogramTotal, colours) {
        function percentEscapedBy(iteration) {
            var no = histogramData[iteration];
            if (no === undefined) {
                // Unfilled entries are zero; past the end of the histogram everything has escaped.
                return iteration >= histogramData.length && iteration < histogramLength ? 0 : 1;
            }
            return no === 0 ? 0 : no / histogramTotal;
        }

        var pixels = new Uint32Array(imageData.buffer, imageData.byteOffset, noOfPixels);
        var lastColour = colours.length - 1;
        for (var idx = 0; idx < noOfPixels; idx += 1) {
            if (imageEscapeValues[idx] === 0) {
                pixels[idx] = black;
            } else {
                var iteration = smoothIterations[idx];
                var iterationFloor = floor(iteration);
                var lower = percentEscapedBy(iterationFloor);
                var higher = percentEscapedBy(iterationFloor + 1);
                pixels[idx] = colours[(((lower + ((higher - lower) * (iteration % 1))) * lastColour) + 0.5) | 0];
            }
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
