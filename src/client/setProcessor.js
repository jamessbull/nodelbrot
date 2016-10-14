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
                processPixelResult(i, j, r.x, r.y, r.iterations, r.escapedAt);
            }
        }
        return _pixelStateTracker;
    };

    var processSetForHistogram = function (_state, _noOfIterations, _startIteration) {
        var pixelStateTracker = {
            histogramData: new Uint32Array(new ArrayBuffer(4 * (_noOfIterations + 1))),
            getPixel : function (i,j) {
                return pixelResult(0,0,0,0);
            },
            putPixel: function (p, i, j) {
                if (p.escapedAt !== 0 && p.escapedAt >= _startIteration && p.escapedAt <= (_startIteration + _noOfIterations)) {
                    var pos = p.escapedAt - _startIteration;
                    this.histogramData[pos] = this.histogramData[pos] + 1 || 1;
                }
            }
        };
        processSet(undefined, _noOfIterations, _state, _startIteration, 4, pixelStateTracker);
        return pixelStateTracker;
    };

    var processSetForHistogramTrackingState = function (_state, _noOfIterations, _startIteration) {
        var pixelStateTracker = {
            histogramData:  new Uint32Array(new ArrayBuffer(4 * (_noOfIterations + 1))),
            width: width,
            state: _state,
            getPixel : function (i,j) {
                return this.state[(j * this.width) + i];
            },
            putPixel: function (p, i, j) {
                this.state[(j * this.width) + i] = p;
                if (p.escapedAt !== 0 && p.escapedAt >= _startIteration && p.escapedAt <= (_startIteration + _noOfIterations)) {
                    var currentPosition = p.escapedAt - _startIteration;
                    this.histogramData[currentPosition] =
                        this.histogramData[currentPosition] ? (this.histogramData[currentPosition] + 1) : 1;
                }
            }
        };
        processSet(undefined, _noOfIterations, _state, _startIteration, 4, pixelStateTracker);
        return pixelStateTracker;
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
            getPixel : function (i,j) {
                if(p === undefined) {
                    console.log("undefined on get");
                }
                return this.state[(j * this.width) + i];
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

        processSet(_deadRegionInfo, _noOfIterations, _state, _startIteration, 9007199254740991, pixelStateTracker);
        return pixelStateTracker;
    };

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
        processSetTrackingState: processSetForHistogramTrackingState
    };
};
