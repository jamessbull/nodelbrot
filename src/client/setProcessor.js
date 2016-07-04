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

        var iterations = 0;
        var mx = 0;
        var my = 0;
        var x = 0;
        var y = 0;
        var escapedAt = 0;
        var tempX = 0;
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

        var pointNeedsDoing = true;
        var deadRegionInfo = _deadRegionInfo;
        var subsampleMultiplier = width/700;

        var escapeVal = 0;
        var escapeTest;
        var iterationsCount = 0;

        var pos;

        var pointNotInDeadRegion = function (i, j, deadRegionInfo) {
            if(!doingImage) {
                return true;
            }
            pos = (floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier);
            return deadRegionInfo[pos - 701] || deadRegionInfo[pos - 700] || deadRegionInfo[pos - 699] ||
                deadRegionInfo[pos - 1] || deadRegionInfo[pos] || deadRegionInfo[pos + 1] ||
                deadRegionInfo[pos + 699] || deadRegionInfo[pos + 700] || deadRegionInfo[pos + 701];
        };

        if(doingImage) {
            escapeTest = 9007199254740991;
        } else {
            escapeTest = 4;
        }
        for (var j = 0 ; j < height; j +=1) {
            for (var i = 0 ; i < width; i += 1) {
                iterations = 0;
                x = 0;
                y = 0;
                escapedAt = 0;
                mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
                my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);
                pointNeedsDoing = pointNotInDeadRegion(i, j, deadRegionInfo);
                if (pointNeedsDoing) {
                    iterationsCount = maxIter;
                    for (iterationsCount; iterationsCount>0; iterationsCount-=1) {
                        escapeVal = (x * x) + (y * y);
                        if (escapedAt === 0 && escapeVal > 4){
                            escapedAt = iterations;
                        }
                        if (escapeVal > escapeTest) break;

                        iterations ++;
                        tempX = x * x - y * y + mx;
                        y = 2 * x * y + my;
                        x = tempX;
                    }
                }
                processPixelResult(i,j,x,y,iterations, escapedAt);
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
