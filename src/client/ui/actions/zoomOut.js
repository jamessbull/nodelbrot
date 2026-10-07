import { matchingCanvas } from "../../dom.js";

// Zooms back out to the view zoomed in from, with an animation, on a double click or when zoomOut() is
// called (by the zoom out button, or a double tap).
export function createZoomOut({events, timer, zoomOutAnim, mandelbrotCanvas, mandelbrotState}) {
    const on = events.listenTo;

    function zoomOut() {
        if (!mandelbrotState.notFullyZoomedOut()) {
            return;
        }
        const from = mandelbrotState.getExtents();
        const to = mandelbrotState.getLastExtents();
        events.fire(events.zoomOut);

        const oldCanvas = matchingCanvas(mandelbrotCanvas);
        oldCanvas.getContext('2d').drawImage(mandelbrotCanvas, 0, 0);
        zoomOutAnim.play(oldCanvas, from, to);
    }

    on(events.leftButtonDown, function () {
        if (timer.timeSinceMark("doubleClickBegin") < 700) {
            zoomOut();
        }
        timer.mark("doubleClickBegin");
    });

    return { zoomOut: zoomOut };
}
