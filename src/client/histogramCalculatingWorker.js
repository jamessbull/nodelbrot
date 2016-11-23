var window = self;

importScripts(
    '/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/setProcessor.js'
);

var worker = jim.worker.msetProcessor.create;
onmessage = function(e) {
    "use strict";
    var mainWorker = worker(e.data, "worker histogram set Processor ");
    var maxIterations = e.data.maxIterations;

    var response = function (progress, histogramTotal, complete, histogramData) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.chunkComplete = complete;
        retVal.result.histogramData = histogramData;
        retVal.result.histogramTotal = histogramTotal;
        return retVal;
    };
    var result;
    result = mainWorker.processSet(parseInt(maxIterations));
    var responseMessage = response(mainWorker.width * mainWorker.height, result.histogramTotal, true, result.histogramData.buffer);
    postMessage(responseMessage, [result.histogramData.buffer]);

};