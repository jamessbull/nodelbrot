namespace("jim.mandelbrot.deadRegions");
jim.mandelbrot.deadRegions.create = function (_sourceState) {
    "use strict";
    return {
        regions: function () {
            return _sourceState;
        }
    };
};