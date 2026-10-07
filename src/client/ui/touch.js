// Passes touches on a canvas to mouse-style handlers, as events with offsetX, offsetY (relative to the
// canvas, in whole pixels), button 0 (left) and a preventDefault, so touch and mouse share the same code.
// handlers can have down, move, up and cancel; cancel defaults to up. touchend and touchcancel carry no
// position, so up and cancel get the last position seen. Touches never scroll or zoom the page. While
// enabled() is false, touches are left alone.
export function forwardTouchToMouse(canvas, handlers, enabled = () => true) {
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

    // Every touch's position is noted, even with no handler for it, so a later up gets it.
    function forward(type, handler, toMouseEvent) {
        canvas.addEventListener(type, function (ev) {
            if (!enabled()) return;
            ev.preventDefault();
            const mouse = toMouseEvent(ev);
            if (handler) {
                handler(mouse);
            }
        }, {passive: false});
    }

    forward("touchstart", handlers.down, atTouch);
    forward("touchmove", handlers.move, atTouch);
    forward("touchend", handlers.up, atLastTouch);
    forward("touchcancel", handlers.cancel || handlers.up, atLastTouch);
}
