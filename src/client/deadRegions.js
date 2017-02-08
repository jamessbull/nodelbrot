namespace("jim.mandelbrot.deadRegions");
jim.mandelbrot.deadRegions.create = function (_events, _canvas, _mandelbrotCanvas) {
    "use strict";
    var deadRegionsCanvas = _canvas;

    function setPixel(index, array, colour) {
        var base = index * 4;
        array[base + 0] = colour.r;
        array[base + 1] = colour.g;
        array[base + 2] = colour.b;
        array[base + 3] = colour.a;
    }

    var radius ;
    var showDeadRegions;
    var calc;

    function calculateDeadRegions(_calc, deadPixelRadius, _width, _height) {
        var context = deadRegionsCanvas.getContext('2d');
        var deadRegionData = new Uint8ClampedArray(4 *_width * _height);
        var deadRegions = _calc;
        var parsedRadius = parseInt(deadPixelRadius ? deadPixelRadius : 1, 10);

        var deadRegionsArray = deadRegions.regions(parsedRadius);

        deadRegionsArray.forEach(function (deadPoint, i) {
            if (deadPoint) {
                setPixel(i, deadRegionData, {r:80,g:80,b:80,a:256});
            } else {
                setPixel(i, deadRegionData, {r:1,g:1,b:1,a:0});
            }
        });
        _events.fire(_events.deadRegionsPublished, deadRegionsArray);
        context.putImageData(new ImageData(deadRegionData, _width, _height), 0, 0);

        return deadRegionsArray;
    }

    on(_events.escapeValuesPublished, function (_escapeValues) {
        console.log("escape values published");
        calc = calculator(_escapeValues, _canvas.width);
        calculateDeadRegions(calc, radius, _canvas.width, _canvas.height);
    });

    on(_events.frameComplete, function () {
        if(showDeadRegions) {
            var context = _mandelbrotCanvas.getContext('2d');
            context.drawImage(deadRegionsCanvas, 0, 0);
            //calculateDeadRegions(calc, radius, _canvas.width, _canvas.height);
        }
    });

    on("showDeadRegions", function (_radius) {
        showDeadRegions = true;
        console.log("fired show dead regions");
        _events.fire(_events.requestEscapeValues);
        console.log("fired request escape values");
        radius = _radius;
    });

    on("hideDeadRegions", function (_radius) {
        //shouldCalculateDeadRegions = false;
        showDeadRegions = false;
        radius = _radius;
    });

    function calculator(_escapeValues, _width) {
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
    }
    return {calculator: calculator};
};