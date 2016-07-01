var window = self;

importScripts('/js/common.js',
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

var worker = jim.worker.msetProcessor.create;

onmessage = function(e) {
    "use strict";
    var mainWorker = worker(e.data);
    var height = mainWorker.height;
    var width = mainWorker.width;
    var maxIter = mainWorker.maximumNumberOfIterations;

    var escapeCheck = function (x, y) {
        return ((x * x) + (y * y)) <= 4;
    };
    var response = function (progress, complete, histogramData, histogramTotal) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.chunkComplete = complete;
        retVal.result.histogramData = histogramData;
        retVal.result.histogramSize = maxIter;
        retVal.result.histogramTotal = histogramTotal;
        return retVal;
    };

    var histogramData = [];
    var histogramTotal = 0;
    for (var d = 0; d < maxIter; d+=1) {
        histogramData[d] = 0;
    }

    var thisPixelHasNotFinished = function (x,y,i,j,iterations) {
        return escapeCheck(x, y) && iterations <= maxIter;
    };

    var processPixelResult = function (i,j,x,y,iterations, escapedAt) {
        if (iterations < maxIter) {
            histogramData[iterations+1] +=1;
            histogramTotal +=1;
        }
    };

    mainWorker.setThisPixelHasNotFinished(thisPixelHasNotFinished);
    mainWorker.setProcessPixelResult(processPixelResult);
    mainWorker.processSet();
    postMessage(response(width * height, true, histogramData, histogramTotal));
};