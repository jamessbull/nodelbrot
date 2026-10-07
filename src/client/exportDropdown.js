export function createExportSizes(_exportSizeSelect, options) {
    const newDimensions = function (w, h) {
        return {width:w, height:h};
    };
    let selectedDimension;
    const orderedDimensions = [
        newDimensions(700, 400),
        newDimensions(2100, 1200),
        newDimensions(4200, 2400),
        newDimensions(6139, 3508),
    ];

    const setExportSize = function () {
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
}
