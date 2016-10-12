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
    //console.log("Starting " + id);

    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);
    var colour = jim.colourCalculator.create();

    var histogram    = jim.twoPhaseHistogram.create(e.data.histogramSize);
    histogram.setData(e.data.histogramData, e.data.histogramTotal);
    //histogram.process();

    var imgData = new Uint8ClampedArray(setProcessor.height * setProcessor.width * 4);
    var currentPixelPos = 0;
    var currentRGBArrayPos = 0;
    var pixelColour = {};

    var processPixelResult = function (i,j,x,y, iterations, escapedAt) {
        currentPixelPos = (j * setProcessor.width + i);
        currentRGBArrayPos = currentPixelPos * 4;

        pixelColour = escapedAt !== 0 ? colour.forPoint(x, y, iterations, histogram, palette): {r:0, g:0, b:0, a:255};
        imgData[currentRGBArrayPos] = pixelColour.r;
        imgData[currentRGBArrayPos + 1] = pixelColour.g;
        imgData[currentRGBArrayPos + 2] = pixelColour.b;
        imgData[currentRGBArrayPos + 3] = pixelColour.a;
    };

    var response = function (progress, complete, imgData) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.imageDone = complete;
        retVal.result.imgData = imgData;
        return retVal;
    };

    setProcessor.setProcessPixelResult(processPixelResult);
    console.log("About to process set for image calculator " + id);

    var result = setProcessor.processSetForImage(e.data.deadRegions, e.data.state, e.data.maxIterations, 0, colour, histogram, palette);
    //console.log("Finished " + id);

    postMessage(response(setProcessor.width * setProcessor.height, true, result.imgData));
};