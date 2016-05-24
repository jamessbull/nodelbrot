var namespace = function (name) {
    "use strict";
    var parts = name.split("."), partial = self;
    parts.forEach(function (part) {
        if (partial[part] === undefined) {
            partial[part] = {};
        }
        partial = partial[part];
    });
};

namespace("jim.colour");
jim.colour.create = function (r, g, b, a) {
    "use strict";
    return {r: r, g: g, b: b, a: a};
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
                toRect.topLeft().x + (((fromPoint.x - fromRect.topLeft().x) * toRect.width()) / fromRect.width()),
                toRect.topLeft().y + (((fromPoint.y - fromRect.topLeft().y) * toRect.height()) / fromRect.height())
            );
        }
    };
};

namespace("jim.coord.translator2");
jim.coord.translator2.create = function () {
    "use strict";
    return {
        translateX: function (fromTopLeftX, fromWidth, toTopLeftX, toWidth, x) {
            return toTopLeftX + (((x - fromTopLeftX) * toWidth) / fromWidth);
        },
        translateY: function (fromTopLeftY, fromHeight, toTopLeftY, toHeight, y) {
            return toTopLeftY + (((y - fromTopLeftY) * toHeight) / fromHeight);
        }
    };
};

namespace("jim.rectangle");
jim.rectangle.create = function (one, two, width, height) {
    "use strict";
    var coord = jim.coord.create, x, y, w, h, topLeft, topRight, bottomLeft, bottomRight,
        present = function (x) {
            return x !== undefined;
        };

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
        topLeft: function () {
            return topLeft;
        },
        topRight: function () {
            return topRight;
        },
        bottomRight: function () {
            return bottomRight;
        },
        bottomLeft: function () {
            return bottomLeft;
        },
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
        copy: function () {
            return jim.rectangle.create(x, y, w, h);
        },
        move: function (ex, wy) {
            x += ex;
            y += wy;
            topLeft.x += ex;
            topLeft.y += wy;
            topRight.x += ex;
            topRight.y += wy;
            bottomRight.x += ex;
            bottomRight.y += wy;
            bottomLeft.x += ex;
            bottomLeft.y += wy;
        },
        split: function (numberOfRows) {
            var split = [];
            var newHeight = h / numberOfRows;

            for (var i = 0 ; i < numberOfRows; i +=1) {
                var y = topLeft.y + (i * newHeight);
                split.push(jim.rectangle.create(topLeft.x, y, w, newHeight));
            }
            return split;
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
                    array[x][y] = f(array[x][y], x, y);
                });
            });
        },
        iterate: function (array, f) {
            array.forEach(function (nested, x) {
                nested.forEach(function (value, y) {
                    f(array[x][y], x, y);
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
        processor = jim.common.grid.processor.create(),
        xOffset = 0,
        yOffset = 0,

        addColumnToLeft = function (xIndex) {
            var columnToAdd = [];
            for (var i = 0; i < grid[0].length; i += 1) {
                columnToAdd.push(f(xIndex, i - yOffset));
            }
            grid.unshift(columnToAdd);
        },
        addColumnToRight = function () {
            var columnToAdd = [];
            var columnViewIndex = grid.length - xOffset;
            for (var currentRow = 0; currentRow < grid[0].length; currentRow += 1) {
                columnToAdd.push(f(columnViewIndex, currentRow - yOffset)); // seems I have forgotten offset values
            }
            grid.push(columnToAdd);
        },
        addColumnsToTheLeftResetXOffset = function (noToAdd) {
            for (var column = noToAdd - 1; column >= 0; column -= 1) {
                addColumnToLeft(column);
            }
            xOffset = 0;
        },
        addColumnsToTheRightLeaveXOffsetAlone = function (noToAdd) {
            for (var i = 0; i < noToAdd; i += 1) {
                addColumnToRight();
            }
        },
        addRowToTop = function (yIndex) {
            for (var i = 0; i < grid.length; i += 1) {
                grid[i].unshift(f(i - xOffset, yIndex));
            }
        },
        addRowToBottom = function () {
            for (var i = 0; i < grid.length; i += 1) {
                grid[i].push(f(i - xOffset, (grid[0].length - (yOffset + 1))));
            }
        },
        addRowsOnBottomLeaveYOffsetAlone = function (noToAdd) {
            for (var rowIndex = 0; rowIndex < noToAdd; rowIndex += 1) {
                addRowToBottom();
            }
        },
        addRowsToTopResetOffset = function (noToAdd) {
            for (var i = noToAdd - 1; i >= 0; i -= 1) {
                addRowToTop(i);
            }
            yOffset = 0;
        },
        numberToAddToLeft = function () {
            return Math.abs(xOffset);
        },
        numberToAddToRight = function () {
            var totalGridSize = xOffset + columnSize;
            if (totalGridSize <= grid.length) {
                return 0;
            }
            return totalGridSize - grid.length;
        },
        numberToAddTop = function () {
            return Math.abs(yOffset);
        },
        numberToAddToBottom = function () {
            var totalGridSize = yOffset + rowSize;
            if (totalGridSize <= grid[0].length) {
                return 0;
            }
            return totalGridSize - grid[0].length;
        };

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
            return grid[x + xOffset][y + yOffset];
        },
        replace: function (f) {
            processor.process(grid, f);
        },
        iterate: function (f) {
            processor.iterate(grid, f);
        },
        iterateVisible: function (f) {
            var i, j;
            for (j = yOffset; j < (yOffset + rowSize); j += 1) {
                for (i = xOffset; i < (xOffset + columnSize); i += 1) {
                    f(grid[i][j], i, j);
                }
            }
        },
        translate: function (x, y) {
            xOffset += x;
            yOffset += y;
            if (xOffset > 0) {
                addColumnsToTheRightLeaveXOffsetAlone(numberToAddToRight());
            } else {
                addColumnsToTheLeftResetXOffset(numberToAddToLeft());
            }
            if (yOffset > 0) {
                addRowsOnBottomLeaveYOffsetAlone(numberToAddToBottom());
            } else {
                addRowsToTopResetOffset(numberToAddTop());
            }
        }
    };
};

namespace("jim.interpolator");
jim.interpolator.create = function () {
    "use strict";
    return {
        loginterpolate: function (from, to, fraction) {
            var retVal = from + ((to - from) * fraction);
            console.log("from " + from + " to " + to + " fraction " + fraction);
            console.log("returning " + retVal);
            return from + ((to - from) * fraction);
        },
        interpolate: function (from, to, fraction) {
            return from + ((to - from) * fraction);
        }
    };
};