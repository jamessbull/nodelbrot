var window = self;

importScripts(
    '/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/setProcessor.js'
);
var mxValues;
var myValues;
var translator   = jim.coord.translator2.create();

function pixelTracker(_msg) {
    "use strict";

    var pixelResultHandler = function (p, i, j, _startIteration, _noOfIterations, _currentNoOfEscapees) {
        return (p.histogramEscapedAt !== 0 && p.histogramEscapedAt >= _startIteration && p.histogramEscapedAt < (_startIteration + _noOfIterations)) ?
            (_currentNoOfEscapees + 1 || 1) : 0;
    };

    var newHistogramDataArray = function (_noOfIterations) {
        return new Uint32Array(new ArrayBuffer(4 * (_noOfIterations + 1)));
    };

    var pixelResult = function (_x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt, mx, my) {
        return {
            x:_x,
            y: _y,
            iterations:_iterations,
            histogramEscapedAt: _histogramEscapedAt,
            imageEscapedAt: _imageEscapedAt,
            mx: mx,
            my:my
        };
    };

    var startIteration = 0;
    var noOfIterations = _msg.maxIterations;
    var width = _msg.exportWidth;
    return {
        histogramData: newHistogramDataArray(noOfIterations),
        histogramTotal: 0,
        getPixel : function (i,j) {
            var mx = translator.translateX(0, _msg.exportWidth, _msg.mx, _msg.mw, i);
            var my = translator.translateY(0, _msg.exportHeight, _msg.my, _msg.mh, j);
            return pixelResult(0,0,0,0,0,mx, my);
        },
        putPixel: function (p, i, j, mx, my) {
            var escapeOffset = (p.histogramEscapedAt - startIteration);
            if (p.histogramEscapedAt !== 0) {
                this.histogramTotal +=1;
            }
            var index = (width * j) + i;
            mxValues[index] = mx;
            myValues[index] = my;
            this.histogramData[escapeOffset] = pixelResultHandler(p, i, j, startIteration, noOfIterations, this.histogramData[escapeOffset]);
        },
        mx: function (i,j) {

        },
        my: function (i,j) {

        }
    };
}

var worker = jim.worker.msetProcessor.create;
onmessage = function(e) {
    "use strict";
    var msg = e.data;
    var mainWorker = worker();
    var maxIterations = msg.maxIterations;
    var width = msg.exportWidth;
    var height = msg.exportHeight;
    mxValues = new Float64Array(width * height);
    myValues = new Float64Array(width * height);
    var response = function (progress, histogramTotal, complete, histogramData, _mxVals, _myVals) {
        var retVal = msg;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.chunkComplete = complete;
        retVal.result.histogramData = histogramData;
        retVal.result.histogramTotal = histogramTotal;
        retVal.result.mxValues = _mxVals;
        retVal.result.myValues = _myVals;
        return retVal;
    };
    var result;
    result = mainWorker.processSet(msg, pixelTracker(msg), 0, parseInt(maxIterations),width, height, []);
    var responseMessage = response(width * height, result.histogramTotal, true, result.histogramData.buffer, mxValues, myValues);
    postMessage(responseMessage, [result.histogramData.buffer, mxValues.buffer, myValues.buffer]);

};