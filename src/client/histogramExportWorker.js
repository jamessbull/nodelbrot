namespace("jim.histogramexportworker");
jim.histogramexportworker.create = function () {


    var mxValues;
    var myValues;

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
                x: _x,
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
                var mx = _msg.mx + (i * _msg.mw);
                var my = _msg.my + (j * _msg.mh);
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
            }
        };
    }

    var worker = jim.worker.msetProcessor.create;
    var onmessage = function(e) {
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

    return {
        onmessage: onmessage
    };
};
