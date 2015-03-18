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
    return {
        x: x,
        y: y,
        distanceTo: function (c) {
            return jim.coord.create(c.x - this.x, c.y - this.y);
        }
    };
};

namespace("jim.coord.translator");
jim.coord.translator.create = function (fromRect, fromPoint) {
    "use strict";
    return {
        translateTo: function (toRect) {
            return jim.coord.create(
                toRect.topLeft().x + (((fromPoint.x - fromRect.topLeft().x) * toRect.width())  / fromRect.width()),
                toRect.topLeft().y + (((fromPoint.y - fromRect.topLeft().y) * toRect.height()) / fromRect.height())
            );
        }
    };
};

namespace("jim.rectangle");
jim.rectangle.create = function (one, two, width, height) {
    "use strict";
    var coord = jim.coord.create, x, y, w, h, topLeft, topRight, bottomLeft, bottomRight,
        present = function (x) { return x !== undefined; };

    if (present(one.x)) {
        x = one.x;
        y = one.y;
        w = two.x;
        h = two.y;
    } else {
        x = one;
        y = two;
        w = width;
        h = height;
    }

    topLeft = coord(x, y);
    topRight = coord(x + w, y);
    bottomLeft = coord(x, y + h);
    bottomRight = coord(x + w, y + h);

    return {
        topLeft:        function () { return topLeft; },
        topRight:       function () { return topRight; },
        bottomRight:    function () { return bottomRight; },
        bottomLeft:     function () { return bottomLeft; },
        width: function (val) {
            if (present(val)) {
                topRight.x = topLeft.x + val;
                bottomRight.x = topLeft.x + val;
                w = val;
            }
            return w;
        },
        height: function (val) {
            if (present(val)) {
                bottomLeft.y = topLeft.y + val;
                bottomRight.y = topLeft.y + val;
                h = val;
            }
            return h;
        },
        resize: function (w, h) {
            this.width(w);
            this.height(h);
        },
        at: function (x, y) {
            var translator = jim.coord.translator.create;
            if (present(x.x)) {
                return translator(this, x);
            }
            return translator(this, jim.coord.create(x, y));
        },
        translateFrom: function (source) {
            var selection = this;
            return {
                to: function (destination) {
                    var topLeft, bottomRight, w, h;
                    topLeft = source.at(selection.topLeft()).translateTo(destination);
                    bottomRight = source.at(selection.bottomRight()).translateTo(destination);
                    return jim.rectangle.create(topLeft, topLeft.distanceTo(bottomRight));
                }
            };
        }
    };
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