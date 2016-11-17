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
    var palette = jim.palette.create();
    palette.fromNodeList(msg.paletteNodes);
    return palette;
}

function initHistogram(msg) {
    "use strict";
    var histogram    = jim.twoPhaseHistogram.create(msg.histogramSize);
    histogram.setData(msg.histogramData, msg.histogramTotal);
    return histogram;
}

function response (msg, progress, complete, imgData, _state) {
    "use strict";
    var retVal = msg;
    retVal.type = "progressReport";
    retVal.event = {msg: progress};
    retVal.result = {};
    retVal.result.progress = progress;
    retVal.result.imageDone = complete;
    retVal.result.imgData = imgData;
    retVal.result.state = _state;
    return retVal;
}

onmessage = function(e) {
    "use strict";
    var msg = getMessage(e);
    var setProcessor = newSetProcessor(msg, " image set processor ");
    var palette = initPalette(msg);
    var colour = getColourCalculator();
    var histogram  = initHistogram(msg);
    var result;
    result = setProcessor.processSetForImage(msg.deadRegions, undefined, msg.maxIterations, msg.currentPosition, colour, histogram, palette);
    postMessage(response(msg, setProcessor.width * setProcessor.height, true, result.imgData, undefined));
};