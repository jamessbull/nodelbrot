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

namespace("jim.coord");
jim.coord.create = function (x, y) {
    "use strict";
    return {x: x, y: y};
};

namespace("jim.rectangle");
jim.rectangle.create = function (x, y, width, height) {
    "use strict";
    var coord = jim.coord.create,
        w = width,
        h = height;
    return {
        topLeft: function () {return coord(x, y); },
        topRight: function () { return coord(x + w, y); },
        bottomRight: function () { return coord(x + w, y + h); },
        bottomLeft: function () { return coord(x, y + h); },
        width: function (newWidth) {
            if (newWidth) {
                w = newWidth;
                return;
            }
            return w;
        },
        height: function (newHeight) {
            if (newHeight) {
                h = newHeight;
                return;
            }
            return h;
        },
        resize: function (w, h) {
            this.width(w);
            this.height(h);
        }
    };
}

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

namespace("jim.common.grid");
jim.common.grid.create = function (columnSize, rowSize, f) {
    "use strict";
    var grid = [],
        row,
        column,
        processor = jim.common.grid.processor.create();

    for (row = 0; row < rowSize; row += 1) {
        for (column = 0; column < columnSize; column += 1) {
            if (!grid[column]) {
                grid[column] = [];
            }
            grid[column].push(f(column, row));
        }
    }
    return {
        at: function (x, y) {
            return grid[x][y];
        },
        run: function (f) {
            processor.process(grid, f);
        }
    };
};