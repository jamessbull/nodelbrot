import { coord } from "../../geometry.js";

export function createMove({events, mandelbrotCanvas, uiCanvas}) {
    const on = events.listenTo;

    let moving = false;
    let totalXMovement;
    let totalYMovement;
    const start = coord();

    on(events.dragStart, function (e) {
        moving = true;
        start.x = e.x;
        start.y = e.y;
        totalXMovement = 0;
        totalYMovement = 0;
    });

    on(events.dragMove, function (e) {
        if(!moving) return;
        totalXMovement = e.x - start.x;
        totalYMovement = e.y - start.y;
        show();
    });

    on(events.dragEnd, function (e) {
        moving = false;
        events.fire(events.moveBy, {x: e.x - start.x, y: e.y - start.y});
        mandelbrotCanvas.getContext('2d').drawImage(uiCanvas, 0, 0, uiCanvas.width, uiCanvas.height);
        uiCanvas.getContext('2d').clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    });

    // The image goes with the pointer, as if picking the fractal up and moving it, as the view does once
    // the drag ends (see viewState.js).
    function show() {
        const ctx = uiCanvas.getContext('2d'), w = uiCanvas.width, h = uiCanvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(mandelbrotCanvas, totalXMovement, totalYMovement, w, h);
    }

    return {};
}
