namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function () {
    "use strict";
    var floor = Math.floor;
    var translator   = jim.coord.translator2.create();

    var processSet = function (_msg, _pixelStateTracker, _startIteration, _noOfIterations, _width, _height, _escapeTest, _deadRegionInfo) {
        var mandelbrotBounds = jim.rectangle.create(_msg.mx, _msg.my, _msg.mw, _msg.mh);
        var mx = 0;
        var my = 0;

        var subsampleMultiplier = _width/700;

        var pointNotInDeadRegion = function (i, j, _deadRegionInfo) {
            return _deadRegionInfo ? !_deadRegionInfo[((floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier))] : true;
        };
        var mwidth = mandelbrotBounds.width();
        var mheight = mandelbrotBounds.height();
        var mnx = mandelbrotBounds.topLeft().x;
        var mny = mandelbrotBounds.topLeft().y;
        var point = jim.newMandelbrotPoint.create();
        for (var j = 0 ; j < _height; j +=1) {
            for (var i = 0 ; i < _width; i += 1) {
                mx = translator.translateX(0, _width, mnx, mwidth, i);
                my = translator.translateY(0, _height, mny, mheight, j);
                var r;
                var pixelState = _pixelStateTracker.getPixel(i,j);
                if (pointNotInDeadRegion(i, j, _deadRegionInfo) && pixelState.imageEscapedAt === 0) {
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

    return {
        processSet: processSet
    };
};
