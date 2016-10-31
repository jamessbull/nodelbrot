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
var noOfMessagesProcessed = 0;
onmessage = function(e) {
    "use strict";
    noOfMessagesProcessed +=1;
    var id = e.data.id;
    var setProcessor = newSetProcessor(e.data, id+" image set processor " + noOfMessagesProcessed);
    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);

    var colour = jim.colourCalculator.create();
    var histogram    = jim.twoPhaseHistogram.create(e.data.histogramSize);
    histogram.setData(e.data.histogramData, e.data.histogramTotal);

    var response = function (progress, complete, imgData, _state) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.imageDone = complete;
        retVal.result.imgData = imgData;
        retVal.result.state = _state;
        return retVal;
    };
    var result;
    if (e.data.state) {
        result = setProcessor.processSetForImageTrackingState(e.data.deadRegions, e.data.state, e.data.maxIterations, e.data.currentPosition, colour, histogram, palette);
        postMessage(response(setProcessor.width * setProcessor.height, true, result.imgData, result.state));

    } else {
        result = setProcessor.processSetForImage(e.data.deadRegions, undefined, e.data.maxIterations, e.data.currentPosition, colour, histogram, palette);
        postMessage(response(setProcessor.width * setProcessor.height, true, result.imgData, undefined));
    }
};