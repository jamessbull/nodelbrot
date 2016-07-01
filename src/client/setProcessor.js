namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function (data) {
    "use strict";
    var width = data.exportWidth;
    var height = data.exportHeight;

    var processPixelResult;
    var thisPixelHasNotFinished;

    var displayBounds = jim.rectangle.create(0,0, width - 1, height -1);
    var mandelbrotBounds = jim.rectangle.create(data.mx, data.my, data.mw, data.mh);

    var processSet = function () {
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

        var escapeCheck = function (x, y) {
            return ((x * x) + (y * y)) <= 4;
        };

        for (var j = 0 ; j < height; j +=1) {
            for (var i = 0 ; i < width; i += 1) {
                iterations = 0;
                x = 0;
                y = 0;
                escapedAt = 0;
                mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
                my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);

                while (thisPixelHasNotFinished(x, y, i, j, iterations)) {
                    if (escapedAt === 0 && !escapeCheck(x, y)) {
                        escapedAt = iterations;
                    }
                    iterations ++;
                    tempX = x * x - y * y + mx;
                    y = 2 * x * y + my;
                    x = tempX;
                }

                processPixelResult(i,j,x,y,iterations, escapedAt);
            }
        }
    };


    return {
        setProcessPixelResult: function (_func) {
            processPixelResult = _func;
        },
        setThisPixelHasNotFinished: function (_func) {
            thisPixelHasNotFinished = _func;
        },
        height: height,
        width: width,
        subSampleMultiplier: width / 700,
        maximumNumberOfIterations: data.maxIterations,
        mandelbrotBounds: mandelbrotBounds,
        displayBounds: displayBounds,
        processSet: processSet
    };
};
