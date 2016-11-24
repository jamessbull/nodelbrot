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
    if(present(one.w)) {
        x = one.x;
        y = one.y;
        w = one.w;
        h = one.h;
    } else {
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

namespace("jim.common.imageExportProgressReporter");
jim.common.imageExportProgressReporter.create = function (_events, _event, _target) {
    "use strict";
    var completedSoFar = 0;
    var currentPercentComplete = 0;
    var roundedPercent = 0;
    var width = 0;
    var height = 0;
    _events.listenTo(_event, function (_number) {
        var num = parseInt(_number);
        var totalToComplete = width * height;
        completedSoFar += num;
        currentPercentComplete = (completedSoFar / totalToComplete) * 100;
        roundedPercent = Math.round(currentPercentComplete * 100) / 100;
        _target.innerText = "" + roundedPercent + "%";
        if(roundedPercent >= 100) {
            completedSoFar = 0;
            currentPercentComplete = 0;
            _target.innerText = "" + roundedPercent + "%";
        }
    });

    return {
        reportOn: function (w,h) {
            width = w;
            height = h;
        }
    };
};
namespace("jim.common.timeReporter");
jim.common.timeReporter.create = function (_target) {
    "use strict";
    var interval;
    var start = 0;
    var stop = 0;
    return {
        start: function () {
            start = new Date().getTime();

            var timefunc = function () {
                var time = Math.floor((new Date().getTime() - start) / 1000);
                _target.innerHTML = time;
            };

            timefunc();
            interval = setInterval(timefunc, 1000);
        },
        stop: function () {
            clearInterval(interval);
        }
    };
};


namespace("jim.interpolator");
jim.interpolator.create = function () {
    "use strict";
    return {
        interpolate: function (from, to, fraction) {
            return from + ((to - from) * fraction);
        }
    };
};

namespace("jim.common");
jim.common.round = function (number, decimalPlaces) {
    "use strict";
    var multiplier = 1;

    for (var i = 0 ; i < decimalPlaces ; i+=1) {
        multiplier *= 10;
    }
    return Math.round(number * multiplier) / multiplier;
};

namespace("jim.dom.functions");
jim.dom.functions.create = function () {
    "use strict";
    var buttonSelectedClass = "buttonSelected";

    var addClass = function (_element, _className) {
        _element.className = _element.className + " " + _className;
    };

    var removeClass = function (_element, _className) {
        _element.classList.remove(_className);
    };

    var selectButton = function (_button) {
        addClass(_button, buttonSelectedClass);
    };

    var deselectButton = function (button) {
        removeClass(button, buttonSelectedClass);
    };

    var hide = function (e) {
        e.style.display="none";
    };

    var show = function (e) {
        e.style.display = "";
    };

    var getElement = function (id) {
        return document.getElementById(id);
    };

    return {
        addClass: addClass,
        removeClass: removeClass,
        selectButton: selectButton,
        deselectButton: deselectButton,
        hide: hide,
        show: show,
        element: getElement
    };
};


