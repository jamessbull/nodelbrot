var window = self;

importScripts('/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/stopWatch.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js',
    '/js/selection.js',
    '/js/mandelbrot.js',
    '/js/colourPicker.js',
    '/js/setProcessor.js');

var newSetProcessor = jim.worker.msetProcessor.create;
var histogram;
var palette = jim.palette.create();

function getMessage(e) {
    "use strict";
    return e.data;
}

function getColourCalculator() {
    "use strict";
    return jim.colourCalculator.create();
}

function initPalette(msg) {
    "use strict";
    palette.fromNodeList(msg.paletteNodes);
    return palette;
}

function initHistogram(msg) {
    "use strict";
    histogram = jim.twoPhaseHistogram.create(msg.histogramSize);
    var histogramDataArray = new Uint32Array(msg.histogramData);
    histogram.setData(histogramDataArray, msg.histogramTotal);
}

function response (msg, imgData) {
    "use strict";
    var retVal = {};
    retVal.result = {};
    retVal.result.imgData = imgData.buffer;
    retVal.result.offset = msg.offset;
    retVal.batchid = msg.batchid;
    return retVal;
}

function calculateSet(msg) {
    "use strict";
    var setProcessor = newSetProcessor();
    var width = msg.exportWidth;
    var height = msg.exportHeight;
    var result;
    result = setProcessor.processSet(msg.extents, pixelTracker(msg), 0, msg.maxIterations, width, height, msg.deadRegions);
    var responseObject = response(msg, result.imgData);
    postMessage(responseObject, [responseObject.result.imgData]);
}

function pixelTracker(_msg) {
    "use strict";
    var colour = getColourCalculator();
    var pixelResult = function (_x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt) {
        return {x:_x, y: _y, iterations:_iterations, histogramEscapedAt: _histogramEscapedAt, imageEscapedAt: _imageEscapedAt};
    };
    return {
        imgData: new Uint8ClampedArray(_msg.exportHeight * _msg.exportWidth * 4),
        getPixel : function (i,j) {
            return pixelResult(0,0,0,0,0);
        },
        putPixel: function (p, i, j) {
            var currentPixelPos = (j * _msg.exportWidth + i);
            var currentRGBArrayPos = currentPixelPos * 4;

            var pixelColour = p.imageEscapedAt !== 0 ? colour.forPoint(p.x, p.y, p.imageEscapedAt, histogram, palette): {r:0, g:0, b:0, a:255};
            this.imgData[currentRGBArrayPos] = pixelColour.r;
            this.imgData[currentRGBArrayPos + 1] = pixelColour.g;
            this.imgData[currentRGBArrayPos + 2] = pixelColour.b;
            this.imgData[currentRGBArrayPos + 3] = pixelColour.a;
        }
    };
}

onmessage = function(e) {
    "use strict";
    var msg = getMessage(e);
    if (msg.updateHistogramData) {
        initHistogram(msg);
        initPalette(msg);
    } else {
        calculateSet(msg);
    }
};