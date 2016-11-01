namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function (data, id) {
    "use strict";
    var width = data.exportWidth;
    var height = data.exportHeight;
    var maxIter = data.maxIterations;
    var floor = Math.floor;
    var processPixelResult;
    var mandelbrotBounds = jim.rectangle.create(data.mx, data.my, data.mw, data.mh);

    var pixelResult = function (_x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt) {
        return {x:_x, y: _y, iterations:_iterations, histogramEscapedAt: _histogramEscapedAt, imageEscapedAt: _imageEscapedAt};
    };

    var processSet2 = function (_noOfIterations,  _startIteration, _escapeTest, _deadRegionInfo, _pixelStateTracker, _width, _height) {

        var mx = 0;
        var my = 0;
        var translator   = jim.coord.translator2.create();

        var subsampleMultiplier = _width/700;

        var pointNotInDeadRegion = function (i, j, _deadRegionInfo) {
            return _deadRegionInfo ? !_deadRegionInfo[((floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier))] : true;
        };

        var point = jim.newMandelbrotPoint.create();
        for (var j = 0 ; j < _height; j +=1) {
            for (var i = 0 ; i < _width; i += 1) {
                mx = translator.translateX(0, _width, mandelbrotBounds.topLeft().x, mandelbrotBounds.width(), i);
                my = translator.translateY(0, _height, mandelbrotBounds.topLeft().y, mandelbrotBounds.height(), j);
                var r;
                var pixelState = _pixelStateTracker.getPixel(i,j);
                if (pointNotInDeadRegion(i, j, _deadRegionInfo) && pixelState.imageEscapedAt === 0) {
                    //
                    r = point.calculate(mx, my, _noOfIterations, _escapeTest, pixelState.x, pixelState.y, _startIteration);
                } else {
                    r = pixelState;
                }
                if(pixelState.histogramEscapedAt !== 0) {
                    r.histogramEscapedAt = pixelState.histogramEscapedAt;
                }
                _pixelStateTracker.putPixel(r, i, j);
            }
        }
        return _pixelStateTracker;
    };

    var newHistogramDataArray = function (_noOfIterations) {
        return new Uint32Array(new ArrayBuffer(4 * (_noOfIterations + 1)));
    };

    var pixelResultHandler = function (p, i, j, _startIteration, _noOfIterations, _currentNoOfEscapees) {
        return (p.histogramEscapedAt !== 0 && p.histogramEscapedAt >= _startIteration && p.histogramEscapedAt <= (_startIteration + _noOfIterations)) ?
            (_currentNoOfEscapees + 1 || 1) : 0;
    };
    var aHistogramPixelTracker = function (_noOfIterations, _startIteration, _pixelResultHandler) {
        return {
            histogramData: newHistogramDataArray(_noOfIterations),
            getPixel : function (i,j) {
                return pixelResult(0,0,0,0,0);
            },
            putPixel: function (p, i, j) {
                var escapeOffset = (p.histogramEscapedAt - _startIteration);
                this.histogramData[escapeOffset] = _pixelResultHandler(p, i, j, _startIteration, _noOfIterations, this.histogramData[escapeOffset]);
            }
        };
    };

    var processSetForHistogram = function (_state, _noOfIterations, _startIteration) {
        var tracker = aHistogramPixelTracker(_noOfIterations, _startIteration, pixelResultHandler);
        processSet2(_noOfIterations, _startIteration, 4, [], tracker, width, height);
        return tracker;
    };

    var processSetForImage = function (_deadRegionInfo, _state, _noOfIterations, _startIteration, _colour, _histogram, _palette) {
        var pixelStateTracker = {
            imgData: new Uint8ClampedArray(height * width * 4),
            state: _state,
            getPixel : function (i,j) {
                return pixelResult(0,0,0,0,0);
            },
            putPixel: function (p, i, j) {
                var currentPixelPos = (j * width + i);
                var currentRGBArrayPos = currentPixelPos * 4;

                var pixelColour = p.imageEscapedAt !== 0 ? _colour.forPoint(p.x, p.y, p.iterations, _histogram, _palette): {r:0, g:0, b:0, a:255};
                this.imgData[currentRGBArrayPos] = pixelColour.r;
                this.imgData[currentRGBArrayPos + 1] = pixelColour.g;
                this.imgData[currentRGBArrayPos + 2] = pixelColour.b;
                this.imgData[currentRGBArrayPos + 3] = pixelColour.a;
            }
        };

        processSet2(_noOfIterations, 0, 9007199254740991, _deadRegionInfo, pixelStateTracker, width, height);
        return pixelStateTracker;
    };

    function updateHistogramData(_p, _histogram, _startIteration, _noOfIterations) {
        if (_p.histogramEscapedAt !== 0 && _p.histogramEscapedAt >= _startIteration && _p.histogramEscapedAt <= (_startIteration + _noOfIterations)) {
            _histogram.add(_p.histogramEscapedAt);
        }
    }

    function updateImageData(i, j, _p, _imageData, _histogram, _colour, _palette, _width) {
        var currentPixelPos = (j * _width + i);
        var currentRGBArrayPos = currentPixelPos * 4;

        var pixelColour = _p.imageEscapedAt !== 0 ? _colour.forPoint(_p.x, _p.y, _p.imageEscapedAt, _histogram, _palette): {r:0, g:0, b:0, a:255};
        _imageData[currentRGBArrayPos] = pixelColour.r;
        _imageData[currentRGBArrayPos + 1] = pixelColour.g;
        _imageData[currentRGBArrayPos + 2] = pixelColour.b;
        _imageData[currentRGBArrayPos + 3] = pixelColour.a;
    }

    function muteIt(_xState, _yState, _escapeValues, _imageEscapeValues, _histogramData, _histogramTotal, _imageData, _iterations, _currentIteration, _width, _height, _colour, _palette) {
        var histogram = jim.histogram.create();
        histogram.setData(_histogramData, _histogramTotal, _currentIteration === 0 ? 0: (_currentIteration -1));
        var pixelStateTracker = {
            getPixel: function (i, j) {
                var index = (j * _width) +i;
                return {
                    x: _xState[index],
                    y: _yState[index],
                    histogramEscapedAt: _escapeValues[index],
                    imageEscapedAt: _imageEscapeValues[index]
                };
            },
            putPixel: function (p,i,j) {
                var index = (j * _width) +i;
                _xState[index] = p.x;
                _yState[index] = p.y;
                _escapeValues[index] = p.histogramEscapedAt;
                _imageEscapeValues[index] = p.imageEscapedAt;
                updateHistogramData(p, histogram, _currentIteration, _iterations);
                updateImageData(i, j, p, _imageData, histogram, _colour, _palette, _width);
            }
        };
        processSet2( _iterations, _currentIteration, 9007199254740991, [], pixelStateTracker, _width, _height);
        pixelStateTracker.histogramTotal = histogram.total();
        return pixelStateTracker;
    }

    return {
        setProcessPixelResult: function (_func) {
            processPixelResult = _func;
        },
        height: height,
        width: width,
        maximumNumberOfIterations: maxIter,
        processSetForImage: processSetForImage,
        processSet: processSetForHistogram,
        processSetMutatingState: muteIt
    };
};
