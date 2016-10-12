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

var worker = jim.worker.msetProcessor.create;
var noOfMsgs = 0;
onmessage = function(e) {
    "use strict";
    noOfMsgs  +=1;
    var id = e.data.id;
    var mainWorker = worker(e.data, "woker " + id + " histogram set Processor " + noOfMsgs);
    var maxIterations = e.data.maxIterations;
    var histogramData = new Uint32Array(new ArrayBuffer(4 * (maxIterations + 1)));
    var start = e.data.start;
    var state = e.data.state;

    var processPixelResult = function (i,j,x,y,iterations, escapedAt) {
        if (escapedAt !== 0 && escapedAt >= start && escapedAt <= (start + maxIterations)) {
            histogramData[escapedAt - start] = histogramData[escapedAt - start] ? (histogramData[escapedAt - start] + 1) : 1;
        }
    };

    var response = function (progress, complete, histogramData, _state, _start) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.setState = _state;
        retVal.result.progress = progress;
        retVal.result.chunkComplete = complete;
        retVal.result.histogramData = histogramData;
        retVal.result.histogramStartIteration = _start;
        return retVal;
    };
    var result;
    mainWorker.setProcessPixelResult(processPixelResult);
    if(state) {
        result = mainWorker.processSetTrackingState(state, maxIterations, start);
        postMessage(response(mainWorker.width * mainWorker.height, true, result.histogramData.buffer, result.state, start), [result.histogramData.buffer]);

    } else {
        result = mainWorker.processSet(state, maxIterations, start);
        postMessage(response(mainWorker.width * mainWorker.height, true, result.histogramData.buffer, undefined, start), [result.histogramData.buffer]);

    }
};