import { matchingCanvas } from "../../dom.js";

export function createZoomOut(_events, _timer, _zoomOutAnim, _mandelbrotCanvas, _mandelbrotState) {
    const on = _events.listenTo;

    on(_events.leftMouseDown, function () {
        if (_timer.timeSinceMark("doubleClickBegin") < 700) {
            const from = _mandelbrotState.getExtents();
            const to = _mandelbrotState.getLastExtents();

            if (_mandelbrotState.notFullyZoomedOut()) {
                _events.fire(_events.zoomOutAction);

                const oldCanvas = matchingCanvas(_mandelbrotCanvas);
                oldCanvas.getContext('2d').drawImage(_mandelbrotCanvas, 0, 0);
                //zoom out anim needs to know before and after mandelbrot coords
                _zoomOutAnim.play(oldCanvas, from, to);
            }

        }
        _timer.mark("doubleClickBegin");
    });

    return {};
}
