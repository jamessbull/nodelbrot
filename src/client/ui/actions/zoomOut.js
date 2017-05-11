namespace("jim.mandelbrot.actions.zoomOut");
jim.mandelbrot.actions.zoomOut.create = function (_events, _timer) {
    "use strict";

    on(_events.leftMouseDown, function () {
        if (_timer.timeSinceMark("doubleClickBegin") < 700) {
            _events.fire(_events.zoomOutAction);
        }
        _timer.mark("doubleClickBegin");
    });

    return {};
};