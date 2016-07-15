namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function (data) {
    "use strict";
    var width = data.exportWidth;
    var height = data.exportHeight;
    var maxIter = data.maxIterations;
    var floor = Math.floor;
    var processPixelResult;
    var doingImage = false;
    var displayBounds = jim.rectangle.create(0,0, width - 1, height -1);
    var mandelbrotBounds = jim.rectangle.create(data.mx, data.my, data.mw, data.mh);

    var processSet = function (_deadRegionInfo) {
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
        var deadRegionInfo = _deadRegionInfo;
        var subsampleMultiplier = width/700;
        var escapeTest;
        var pos;

        var pointNotInDeadRegion = function (i, j, deadRegionInfo) {
            if(!doingImage) {
                return true;
            }
            pos = (floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier);
            return !deadRegionInfo[pos];
        };

        if(doingImage) {
            escapeTest = 9007199254740991;
        } else {
            escapeTest = 4;
        }

        function calculatePoint(mx, my, iterationsCount, escapeTest, returnVal) {
            var x = 0;
            var y = 0;
            var iterations = 0;
            var escapedAt = 0;
            var xSquared = 0;
            var ySquared = 0;
            var xSquaredPlusYSquared = 0;

            while (iterationsCount>0) {
                xSquared = x * x;
                ySquared = y * y;
                xSquaredPlusYSquared = xSquared + ySquared;

                if(escapedAt === 0 && xSquaredPlusYSquared > escapeTest) {
                    escapedAt = iterations;
                    break;
                }

                iterations++;
                y = ((x * y) *2 ) + my;
                x = xSquared - ySquared + mx;
                iterationsCount-=1;
            }
            returnVal.x = x;
            returnVal.y = y;
            returnVal.iterations = iterations;
            returnVal.escapedAt = escapedAt;
            return returnVal;
        }
        var pixelResult = {x:0, y:0, iterations:0, escapedAt:0};
        for (var j = 0 ; j < height; j +=1) {
            for (var i = 0 ; i < width; i += 1) {
                mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
                my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);
                if (pointNotInDeadRegion(i, j, deadRegionInfo)) {
                    pixelResult = calculatePoint(mx, my, maxIter, escapeTest, pixelResult);
                } else {
                    pixelResult.x = 0;
                    pixelResult.y = 0;
                    pixelResult.iterations = 0;
                    pixelResult.escapedAt = 0;
                }
                processPixelResult(i,j,pixelResult.x,pixelResult.y,pixelResult.iterations, pixelResult.escapedAt);
            }
        }
    };

    var processSetForHistogram = function () {
        doingImage = false;
        processSet([]);
    };

    var processSetForImage = function (_deadRegionInfo) {
        doingImage = true;
        processSet(_deadRegionInfo);
    };


    return {
        setProcessPixelResult: function (_func) {
            processPixelResult = _func;
        },
        height: height,
        width: width,
        maximumNumberOfIterations: maxIter,
        processSetForImage: processSetForImage,
        processSet: processSetForHistogram
    };
};
