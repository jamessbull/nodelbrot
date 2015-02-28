var namespace = function (name) {
    "use strict";
    var parts = name.split("."), partial = window;
    parts.forEach(function (part) {
        if (partial[part] === undefined) {
            partial[part] = {};
        }
        partial = partial[part];
    });
};

namespace("jim.common.grid.processor");
jim.common.grid.processor.create = function () {
    "use strict";
    return {
        process: function (array, f) {
            array.forEach(function (nested, x) {
                nested.forEach(function (value, y) {
                    array[x][y] = f(array[x][y]);
                });
            });
        }
    };
};