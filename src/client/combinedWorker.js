var window = self;

importScripts(
    '/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/stopWatch.js',
    '/js/setProcessor.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js'
);

onmessage = function(e) {
    "use strict";
    var msg = e.data;
    var setProcessor = jim.worker.msetProcessor.create(msg, "worker histogram set Processor ");
    var xState = new Float64Array(msg.xStateBuffer);
    var yState = new Float64Array(msg.yStateBuffer);
    var imageEscapeValues = new Uint32Array(msg.imageEscapeValuesBuffer);
    var escapeValues = new Uint32Array(msg.escapeValuesBuffer);
    var histogramData = new Uint32Array(msg.histogramDataBuffer);
    var histogramTotal = msg.histogramTotal;
    var imageData = new Uint8ClampedArray(msg.imageDataBuffer);
    var palette = jim.palette.create();
    palette.fromNodeList(msg.paletteNodes);
    var colour = jim.colourCalculator.create();

    function postStateBack() {
        postMessage(message(), [xState.buffer, yState.buffer, escapeValues.buffer, histogramData.buffer, imageData.buffer, imageEscapeValues.buffer]);
    }

    function message () {
        return {
            xStateBuffer:xState.buffer,
            yStateBuffer:yState.buffer,
            escapeValuesBuffer: escapeValues.buffer,
            imageEscapeValuesBuffer: imageEscapeValues.buffer,
            histogramDataBuffer: histogramData.buffer,
            imageDataBuffer: imageData.buffer,
            histogramTotal: histogramTotal
        };
    }

     var tracker = setProcessor.processSetMutatingState(xState, yState, escapeValues, imageEscapeValues, histogramData, histogramTotal, imageData, msg.iterations, msg.currentIteration, msg.width, msg.height, colour, palette, []);
    histogramTotal = tracker.histogramTotal;
    postStateBack();
};