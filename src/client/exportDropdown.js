namespace("jim.mandelbrot.exportDropdown");

jim.mandelbrot.exportDropdown.create = function (_exportSizeSelect, options) {
    "use strict";
    var newDimensions = function (w, h) {
        return {width:w, height:h};
    };
    var selectedDimension;
    var orderedDimensions = [
        newDimensions(700, 400),
        newDimensions(2100, 1200),
        newDimensions(4200, 2400),
        newDimensions(6139, 3508),
    ];

    var setExportSize = function () {
        options.forEach(function (option, index) {
            if (option.selected) {
                selectedDimension = orderedDimensions[index];
            }
        });
    };

    _exportSizeSelect.onchange = function () {
        setExportSize();
    };
    setExportSize();
    return {
        dimensions: function () {
            return selectedDimension;
        }
    };
};