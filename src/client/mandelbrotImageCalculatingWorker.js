var window = self;

importScripts('/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/stopWatch.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js',
    '/js/selection.js',
    '/js/mandelbrot-ui.js',
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
    return retVal;
}

function calculateSet(msg) {
    "use strict";
    var setProcessor = newSetProcessor(msg, " image set processor ");
//    var palette = initPalette(msg);
    var colour = getColourCalculator();
    var result;
    result = setProcessor.processSetForImage(msg.deadRegions, undefined, msg.maxIterations, msg.currentPosition, colour, histogram, palette);
    var responseObject = response(msg, result.imgData);
    postMessage(responseObject, [responseObject.result.imgData]);
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