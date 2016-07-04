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
    var maxIter = mainWorker.maximumNumberOfIterations;

    var histogramData = [];
    var histogramTotal = 0;
    for (var d = 0; d < maxIter; d+=1) {
        histogramData[d] = 0;
    }

    var processPixelResult = function (i,j,x,y,iterations) {
        if (iterations < maxIter) {
            histogramData[iterations+1] +=1;
            histogramTotal +=1;
        }
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

    mainWorker.setProcessPixelResult(processPixelResult);
    mainWorker.processSet();

    postMessage(response(mainWorker.width *  mainWorker.height, true, histogramData, histogramTotal));
};