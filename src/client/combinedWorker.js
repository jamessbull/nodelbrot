var window = self;

importScripts(
    '/js/common.js',
    '/js/events.js',
    '/js/mandelbrotPoint.js',
    '/js/stopWatch.js',
    '/js/setProcessor.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js'
);
function newExtents(x,y,w,h) {
    "use strict";
    return {mw:w, mh: h, mx: x, my:y};
}
var setProcessor = jim.worker.msetProcessor.create();
var palette = jim.palette.create(jim.events.create());
var colour = jim.colourCalculator.create();
var histogram = jim.twoPhaseHistogram.create(0);
var histogramForColour = jim.twoPhaseHistogram.create(0);
var extents = newExtents(-1,0, 3, 4);
var xState;
var yState;
var escapeValues;
var imageEscapeValues;
var reset;

function initState(_noOfPixels) {
    "use strict";
    xState = new Float64Array(_noOfPixels);
    yState = new Float64Array(_noOfPixels);
    escapeValues = new Uint32Array(_noOfPixels);
    imageEscapeValues = new Uint32Array(_noOfPixels);
    reset = true;
}

var pixelStateTracker = (function () {
    "use strict";
    var pixelStateTracker = {};
    pixelStateTracker.updateImageData = function (i, j, _p, _imageData, _histogram, _colour, _palette, _width) {
        var currentPixelPos = (j * _width + i);
        var currentRGBArrayPos = currentPixelPos * 4;

        var pixelColour = _p.imageEscapedAt !== 0 ? _colour.forPoint(_p.x, _p.y, _p.imageEscapedAt, _histogram, _palette): {r:0, g:0, b:0, a:255};
        _imageData[currentRGBArrayPos] = pixelColour.r;
        _imageData[currentRGBArrayPos + 1] = pixelColour.g;
        _imageData[currentRGBArrayPos + 2] = pixelColour.b;
        _imageData[currentRGBArrayPos + 3] = pixelColour.a;
    };

    pixelStateTracker.updateHistogramData = function (_p, _startIteration, _noOfIterations, i, j) {
        if (_p.histogramEscapedAt !== 0 && _p.histogramEscapedAt >= _startIteration && _p.histogramEscapedAt < (_startIteration + _noOfIterations)) {
            this.histogramUpdate[(_p.histogramEscapedAt - _startIteration) ] +=1;
        }
    };

    pixelStateTracker.getPixel= function (i, j) {
        var mx = extents.mx + (i * extents.stepX);
        var my = extents.my + (j * extents.stepY);
        var index = (j * this.width) +i;
        var newPixel = {
            x: this.xState[index],
            y: this.yState[index],
            histogramEscapedAt: this.escapeValues[index],
            imageEscapedAt: this.imageEscapeValues[index],
            mx: mx,
            my: my
        };
        return newPixel;
    };
    pixelStateTracker.putPixel= function (p,i,j,mx,my) {
        var index = (j * this.width) +i;
        this.xState[index] = p.x;
        this.yState[index] = p.y;
        this.escapeValues[index] = p.histogramEscapedAt;
        this.imageEscapeValues[index] = p.imageEscapedAt;
        this.updateHistogramData(p, this.currentIteration, this.iterations,i ,j);
        this.updateImageData(i, j, p, this.imageData, this.histogramForColour, this.colour, this.palette, this.width);
    };
    return pixelStateTracker;
}());

onmessage = function(e) {
    "use strict";
    var msg = e.data;
    var noOfPixels = msg.exportWidth * msg.exportHeight;
    var noOfIterations = msg.iterations;
    var histogramUpdate = new Uint32Array(noOfIterations);
    var histogramData = new Uint32Array(msg.histogramDataBuffer);
    var histogramTotal = msg.histogramTotal;
    var escapeValuesToTransfer;
    var offset = msg.offset;

    function message () {
        escapeValuesToTransfer = new Uint32Array(pixelStateTracker.escapeValues);
        var messageToPost = {
            offset: offset,
            batchid: msg.batchid,
            histogramUpdate: pixelStateTracker.histogramUpdate.buffer,
            imageDataBuffer: pixelStateTracker.imageData.buffer,
            escapeValues: escapeValuesToTransfer.buffer,
            histogramTotal: histogram.histogramTotal,
            extraDataSent: false,
            reset: reset
        };
        if(msg.sendData) {
            console.log("Send data is true");
            messageToPost.xState = xState;
            messageToPost.yState = yState;
            messageToPost.imageEscapeValues = pixelStateTracker.imageEscapeValues;
            messageToPost.extraDataSent = true;
        }
        return messageToPost;
    }
    pixelStateTracker.imageData = new Uint8ClampedArray(4 * noOfPixels);
    pixelStateTracker.iterations = noOfIterations;
    pixelStateTracker.currentIteration  = msg.currentIteration;
    pixelStateTracker.colour = colour;
    pixelStateTracker.histogramUpdate = histogramUpdate;

    if (!xState || msg.extents) {
        initState(noOfPixels);
        pixelStateTracker.xState = xState;
        pixelStateTracker.yState = yState;
        pixelStateTracker.escapeValues = escapeValues;
        pixelStateTracker.imageEscapeValues = imageEscapeValues;
    }

    if (msg.extents) {
        extents = msg.extents;
        pixelStateTracker.width = msg.exportWidth;
    }

    if (msg.paletteNodes) {
        palette.fromNodeList(msg.paletteNodes);
    }

    pixelStateTracker.palette = palette;

    histogramForColour.setData(histogramData, histogramTotal);//array copy here. Needed?
    pixelStateTracker.histogramForColour = histogramForColour;
    pixelStateTracker.width = msg.exportWidth;

    pixelStateTracker.msg = msg;
    pixelStateTracker.msg.mx = extents.mx;
    pixelStateTracker.msg.my = extents.my;
    pixelStateTracker.msg.mw = extents.mw;
    pixelStateTracker.msg.mh = extents.mh;

    setProcessor.processSet(extents, pixelStateTracker, msg.currentIteration, noOfIterations, msg.exportWidth, msg.exportHeight, undefined);
    postMessage(message(), [pixelStateTracker.imageData.buffer, pixelStateTracker.histogramUpdate.buffer, escapeValuesToTransfer.buffer]);
    reset = false;

};