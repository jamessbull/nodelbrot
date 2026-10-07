import { matchingCanvas } from "../../dom.js";

export function createZoomIn({mandelbrotCanvas, uiCanvas, events, selection, zoomAnim}) {
    const on = events.listenTo;
    let selecting = false;
    const ctx = uiCanvas.getContext('2d');

    on(events.selectionStart, function (e) {
        selecting = true;
        selection.begin(e);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0,0, uiCanvas.width,uiCanvas.height);
    });

    on(events.selectionEnd, function (e) {
        selection.end(e);
        if (selection.area().width() > 10) {
            const existingRender = matchingCanvas(uiCanvas);
            existingRender.getContext('2d').drawImage(mandelbrotCanvas, 0,0);
            events.fire(events.zoomToSelection, selection);
            zoomAnim.play(selection, existingRender);
        }
        selecting = false;
        ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    });

    on(events.selectionMove, function (e) {
        if (selecting) {
            selection.change(e);
            ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0,0, uiCanvas.width,uiCanvas.height);
            selection.show(ctx);
        }
    });

    return {};
}
