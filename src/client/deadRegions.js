namespace("jim.mandelbrot.deadRegions");
jim.mandelbrot.deadRegions.create = function (_escapeValues, _width) {
    "use strict";
    return {
        regions: function (safetyMargin) {
            var deadRegions = new Uint32Array(_escapeValues.length);
            var sourceRegions = _escapeValues;

            var rowIsDead = function (_rowStart) {
                var rowEnd = (safetyMargin * 2) + _rowStart;

                var onSameRow = function (i,j) {
                    return Math.floor(i/_width) === Math.floor(j/_width);
                };

                for (var i = _rowStart ; i <= rowEnd; i+=1) {

                    if (i >= 0 && i<sourceRegions.length && onSameRow(i, _rowStart + safetyMargin) && sourceRegions[i] !==0 ) {
                        return false;
                    }
                }
                return true;
            };

            var pixelIsDead = function (index) {
                var firstRowStart = index  - ((_width +1) * safetyMargin);
                var lastRowStart = firstRowStart + (2 * _width * safetyMargin);
                for(var i = firstRowStart; i <= lastRowStart; i+= _width ) {
                    if(!rowIsDead(i)) {
                        return false;
                    }
                }
                return true;
            };

            _escapeValues.forEach(function (state, index) {
                deadRegions[index] = pixelIsDead(index);
            });
            return deadRegions;
        }
    };
};