namespace("jim.mandelbrot.actions.zoomOut");
jim.mandelbrot.actions.zoomOut.create = function (_events, _timer, _zoomOutAnim, _mandelbrotCanvas, _mandelbrotState) {
    "use strict";

    function newMatchingCanvas(_originalCanvas) {
        var matchingCanvas = document.createElement('canvas');
        matchingCanvas.width = _originalCanvas.width;
        matchingCanvas.height = _originalCanvas.height;
        return matchingCanvas;
    }

    on(_events.leftMouseDown, function () {
        _events.fire(_events.hideDeadRegions);
        if (_timer.timeSinceMark("doubleClickBegin") < 700) {
            var from = _mandelbrotState.getExtents();
            var to = _mandelbrotState.getLastExtents();
            _events.fire(_events.zoomOutAction);
            var oldCanvas = newMatchingCanvas(_mandelbrotCanvas);
            oldCanvas.getContext('2d').drawImage(_mandelbrotCanvas, 0, 0);
            //zoom out anim needs to know before and after mandelbrot coords
            _zoomOutAnim.play(oldCanvas, from, to);
        }
        _timer.mark("doubleClickBegin");
    });

    return {};
};