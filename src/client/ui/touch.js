// Passes touches on a canvas to mouse-style handlers, as events with offsetX, offsetY (relative to the
// canvas, in whole pixels), button 0 (left) and a preventDefault, so touch and mouse share the same code.
// handlers can have down, move, up and cancel; cancel defaults to up. touchend and touchcancel carry no
// position, so up and cancel get the last position seen. Touches never scroll or zoom the page.
export function forwardTouchToMouse(canvas, handlers) {
    let lastX = 0;
    let lastY = 0;

    function mouseEvent(x, y) {
        return {offsetX: x, offsetY: y, button: 0, preventDefault: function () {}};
    }

    function atTouch(ev) {
        const bounds = canvas.getBoundingClientRect();
        lastX = Math.round(ev.touches[0].clientX - bounds.x);
        lastY = Math.round(ev.touches[0].clientY - bounds.y);
        return mouseEvent(lastX, lastY);
    }

    function atLastTouch() {
        return mouseEvent(lastX, lastY);
    }

    function forward(type, handler, toMouseEvent) {
        canvas.addEventListener(type, function (ev) {
            ev.preventDefault();
            if (handler) {
                handler(toMouseEvent(ev));
            }
        });
    }

    forward("touchstart", handlers.down, atTouch);
    forward("touchmove", handlers.move, atTouch);
    forward("touchend", handlers.up, atLastTouch);
    forward("touchcancel", handlers.cancel || handlers.up, atLastTouch);
}
