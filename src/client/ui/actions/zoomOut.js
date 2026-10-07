import { matchingCanvas } from "../../dom.js";

// Zooms back out to the view zoomed in from, with an animation, on a double click or when zoomOut() is
// called (by the zoom out button, or a double tap).
export function createZoomOut(_events, _timer, _zoomOutAnim, _mandelbrotCanvas, _mandelbrotState) {
    const on = _events.listenTo;

    function zoomOut() {
        if (!_mandelbrotState.notFullyZoomedOut()) {
            return;
        }
        const from = _mandelbrotState.getExtents();
        const to = _mandelbrotState.getLastExtents();
        _events.fire(_events.zoomOutAction);

        const oldCanvas = matchingCanvas(_mandelbrotCanvas);
        oldCanvas.getContext('2d').drawImage(_mandelbrotCanvas, 0, 0);
        _zoomOutAnim.play(oldCanvas, from, to);
    }

    on(_events.leftMouseDown, function () {
        if (_timer.timeSinceMark("doubleClickBegin") < 700) {
            zoomOut();
        }
        _timer.mark("doubleClickBegin");
    });

    return { zoomOut: zoomOut };
}
