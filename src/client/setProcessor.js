namespace("jim.worker.msetProcessor");
jim.worker.msetProcessor.create = function () {
    "use strict";
    var floor = Math.floor;

    var point = jim.newMandelbrotPoint.create();

    var processSet = function (_msg, _pixelStateTracker, _startIteration, _noOfIterations, _width, _height, _deadRegionInfo) {
        var mx = 0;
        var my = 0;
        var subsampleMultiplier = _width/700;
        var shouldCalculatePoint = function (i, j, _deadRegionInfo) {
            return _deadRegionInfo ? !_deadRegionInfo[((floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier))] : true;
        };
        var currentPoint;
        var currentPointX;
        var currentPointY;
        var currentPointHistoEscaped;

        for (var j = 0 ; j < _height; j +=1) {
            for (var i = 0 ; i < _width; i += 1) {
                currentPoint = _pixelStateTracker.getPixel(i,j);
                if (shouldCalculatePoint(i, j, _deadRegionInfo) && currentPoint.imageEscapedAt === 0) {
                    mx = currentPoint.mx;
                    my = currentPoint.my;
                    currentPointX = currentPoint.x || 0;
                    currentPointY = currentPoint.y || 0;
                    currentPointHistoEscaped = currentPoint.histogramEscapedAt;
                    currentPoint = point.calculate(mx, my, _noOfIterations, _startIteration, currentPointX, currentPointY, currentPointHistoEscaped);
                }
                _pixelStateTracker.putPixel(currentPoint, i, j, mx, my);
            }
        }
        return _pixelStateTracker;
    };

    return {
        processSet: processSet
    };
};
