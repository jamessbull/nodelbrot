namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function (data, id) {
    "use strict";
    var width = data.exportWidth;
    var height = data.exportHeight;
    var maxIter = data.maxIterations;
    var floor = Math.floor;
    var processPixelResult;
    var displayBounds = jim.rectangle.create(0,0, width - 1, height -1);
    var mandelbrotBounds = jim.rectangle.create(data.mx, data.my, data.mw, data.mh);

    var pixelResult = function (_x, _y, _iterations, _escapedAt) {
        return {x:_x, y: _y, iterations:_iterations, escapedAt: _escapedAt};
    };

    var processSet = function (_deadRegionInfo, _noOfIterations, _state, _startIteration, _escapeTest, _pixelStateTracker) {
        var startIteration = 0;
        if(_startIteration !== undefined) {
            startIteration = _startIteration;
        }
        var mx = 0;
        var my = 0;
        var translator   = jim.coord.translator2.create();

        var fromTopLeftX = displayBounds.topLeft().x;
        var fromTopLeftY = displayBounds.topLeft().y;
        var fromWidth    = displayBounds.width();
        var fromHeight   = displayBounds.height();

        var toTopLeftX   = mandelbrotBounds.topLeft().x;
        var toTopLeftY   = mandelbrotBounds.topLeft().y;
        var toWidth      = mandelbrotBounds.width();
        var toHeight     = mandelbrotBounds.height();

        var maxIter = data.maxIterations;
        var noOfIterations = _noOfIterations === undefined ? maxIter: _noOfIterations;
        var deadRegionInfo = _deadRegionInfo;
        var subsampleMultiplier = width/700;

        var pointNotInDeadRegion = function (i, j, deadRegionInfo) {
            return deadRegionInfo ? !deadRegionInfo[((floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier))] : true;
        };

        var point = jim.newMandelbrotPoint.create();
        for (var j = 0 ; j < height; j +=1) {
            for (var i = 0 ; i < width; i += 1) {
                mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
                my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);
                var r;
                var pixelState = _pixelStateTracker.getPixel(i,j);
                if (pointNotInDeadRegion(i, j, deadRegionInfo) && pixelState.escapedAt === 0) {
                    r = point.calculate(mx, my, noOfIterations, _escapeTest, pixelState.x, pixelState.y, startIteration);
                } else {
                    r = pixelState;
                }
                _pixelStateTracker.putPixel(r, i, j);
                //processPixelResult(i, j, r.x, r.y, r.iterations, r.escapedAt);
            }
        }
        return _pixelStateTracker;
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
        return (p.escapedAt !== 0 && p.escapedAt >= _startIteration && p.escapedAt <= (_startIteration + _noOfIterations)) ?
            (_currentNoOfEscapees + 1 || 1) : 0;
    };
    var aHistogramPixelTracker = function (_noOfIterations, _startIteration, _pixelResultHandler) {
        return {
            histogramData: newHistogramDataArray(_noOfIterations),
            getPixel : function (i,j) {
                return pixelResult(0,0,0,0);
            },
            putPixel: function (p, i, j) {
                var escapeOffset = (p.escapedAt - _startIteration);
                this.histogramData[escapeOffset] = _pixelResultHandler(p, i, j, _startIteration, _noOfIterations, this.histogramData[escapeOffset]);
            }
        };
    };
    var aHistogramPixelStateTracker = function (_state, _noOfIterations, _startIteration, _pixelResultHandler) {
        return {
            histogramData:  newHistogramDataArray(_noOfIterations),
            state: _state,
            width: width,
            getPixel: function (i, j) {
                return this.state[(j * this.width) + i];
            },
            putPixel: function (p, i, j) {
                this.state[(j * this.width) + i] = p;
                var escapeOffset = p.escapedAt - _startIteration;
                this.histogramData[escapeOffset] = _pixelResultHandler(p, i, j, _startIteration, _noOfIterations, this.histogramData[escapeOffset]);
            }
        };
    };

    var processSetForHistogram = function (_state, _noOfIterations, _startIteration) {
        var tracker = aHistogramPixelTracker(_noOfIterations, _startIteration, pixelResultHandler);
        processSet(undefined, _noOfIterations, _state, _startIteration, 4, tracker);
        return tracker;
    };

    var processSetForHistogramTrackingState = function (_state, _noOfIterations, _startIteration) {
        var tracker = aHistogramPixelStateTracker(_state, _noOfIterations, _startIteration, pixelResultHandler);
        processSet(undefined, _noOfIterations, _state, _startIteration, 4, tracker);
        return tracker;
    };

    var processSetForImage = function (_deadRegionInfo, _state, _noOfIterations, _startIteration, _colour, _histogram, _palette) {
        var pixelStateTracker = {
            imgData: new Uint8ClampedArray(height * width * 4),
            state: _state,
            getPixel : function (i,j) {
                return pixelResult(0,0,0,0);
            },
            putPixel: function (p, i, j) {
                var currentPixelPos = (j * width + i);
                var currentRGBArrayPos = currentPixelPos * 4;

                var pixelColour = p.escapedAt !== 0 ? _colour.forPoint(p.x, p.y, p.iterations, _histogram, _palette): {r:0, g:0, b:0, a:255};
                this.imgData[currentRGBArrayPos] = pixelColour.r;
                this.imgData[currentRGBArrayPos + 1] = pixelColour.g;
                this.imgData[currentRGBArrayPos + 2] = pixelColour.b;
                this.imgData[currentRGBArrayPos + 3] = pixelColour.a;
            }
        };

        processSet(_deadRegionInfo, _noOfIterations, _state, 0, 9007199254740991, pixelStateTracker);
        return pixelStateTracker;
    };

    var processSetForImageTrackingState = function (_deadRegionInfo, _state, _noOfIterations, _startIteration, _colour, _histogram, _palette) {
        var pixelStateTracker = {
            imgData: new Uint8ClampedArray(height * width * 4),
            state: _state,
            width: width,
            getPixel : function (i,j) {
                return this.state[(j * this.width) + i];
            },
            putPixel: function (p, i, j) {
                this.state[(j * this.width) + i] = p;
                var currentPixelPos = (j * width + i);
                var currentRGBArrayPos = currentPixelPos * 4;

                var pixelColour = p.escapedAt !== 0 ? _colour.forPoint(p.x, p.y, p.iterations, _histogram, _palette): {r:0, g:0, b:0, a:255};
                this.imgData[currentRGBArrayPos] = pixelColour.r;
                this.imgData[currentRGBArrayPos + 1] = pixelColour.g;
                this.imgData[currentRGBArrayPos + 2] = pixelColour.b;
                this.imgData[currentRGBArrayPos + 3] = pixelColour.a;
            }
        };

        processSet(_deadRegionInfo, _noOfIterations, _state, _startIteration, 9007199254740991, pixelStateTracker);
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
        processSetForImageTrackingState: processSetForImageTrackingState,
        processSet: processSetForHistogram,
        processSetTrackingState: processSetForHistogramTrackingState,
        processSetMutatingState: muteIt
    };
};
