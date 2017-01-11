namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function () {
    "use strict";
    var floor = Math.floor;
    var translator   = jim.coord.translator2.create();
    var point = jim.newMandelbrotPoint.create();

    var processSet = function (_msg, _pixelStateTracker, _startIteration, _noOfIterations, _width, _height, _deadRegionInfo) {
        var mx = 0;
        var my = 0;
        var subsampleMultiplier = _width/700;

        var shouldCalculatePoint = function (i, j, _deadRegionInfo) {
            return _deadRegionInfo ? !_deadRegionInfo[((floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier))] : true;
        };
        var mwidth = _msg.mw;
        var mheight = _msg.mh;
        var mnx = _msg.mx;
        var mny = _msg.my;
        var currentPoint;
        var currentPointX;
        var currentPointY;
        var currentPointHistoEscaped;

        for (var j = 0 ; j < _height; j +=1) {
            for (var i = 0 ; i < _width; i += 1) {
                currentPoint = _pixelStateTracker.getPixel(i,j);
                if (shouldCalculatePoint(i, j, _deadRegionInfo) && currentPoint.imageEscapedAt === 0) {
                    mx = translator.translateX(0, _width, mnx, mwidth, i);
                    my = translator.translateY(0, _height, mny, mheight, j);
                    currentPointX = currentPoint.x || 0;
                    currentPointY = currentPoint.y || 0;
                    currentPointHistoEscaped = currentPoint.histogramEscapedAt;
                    currentPoint = point.calculate(mx, my, _noOfIterations, _startIteration, currentPointX, currentPointY, currentPointHistoEscaped);
                }
                _pixelStateTracker.putPixel(currentPoint, i, j);
            }
        }
        return _pixelStateTracker;
    };

    return {
        processSet: processSet
    };
};
