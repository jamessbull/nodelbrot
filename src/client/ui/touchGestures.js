// Touch gestures on the image, for exploring: drag with one finger to move, pinch with two to zoom (and
// move), and double tap to zoom out. While fingers are down, the image is shown moved and scaled on
// overlay, the canvas laid over it; when they are all lifted, onTransform gets the change as
// {scale, translateX, translateY}: a point that was at p on the image is now at scale * p + translate.
// onDoubleTap is called for a double tap. Taps and drags too small to mean anything do nothing. Touches
// are ignored while enabled() is false.
export function createTouchGestures(overlay, image, {onTransform, onDoubleTap, enabled = () => true}) {
    const context = overlay.getContext("2d");
    const doubleTapMs = 300;
    const tapSlop = 10;             // pixels a finger can wander and still be tapping
    let fingers = [];               // the fingers down, {id, x, y} relative to the canvas, where they started
    let base = identity();          // the change made by fingers that have since been lifted or joined
    let current = identity();       // the change made by the fingers down now
    let moved = false;
    let lastTap = null;             // {time, x, y} of the last tap that might start a double tap

    function identity() {
        return {scale: 1, translateX: 0, translateY: 0};
    }

    // second applied after first.
    function compose(first, second) {
        return {
            scale: second.scale * first.scale,
            translateX: (second.scale * first.translateX) + second.translateX,
            translateY: (second.scale * first.translateY) + second.translateY
        };
    }

    function positionOf(touch) {
        const bounds = overlay.getBoundingClientRect();
        return {id: touch.identifier, x: touch.clientX - bounds.left, y: touch.clientY - bounds.top};
    }

    function centreAndSpread(points) {
        const x = points.reduce((total, p) => total + p.x, 0) / points.length;
        const y = points.reduce((total, p) => total + p.y, 0) / points.length;
        const spread = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
        return {x: x, y: y, spread: spread};
    }

    // The change from where the fingers started to where they are now: the point between them follows
    // them, scaled by how far apart they have moved.
    function changeSinceStart(now) {
        const from = centreAndSpread(fingers);
        const to = centreAndSpread(fingers.map((f) => now.find((n) => n.id === f.id) || f));
        const scale = from.spread > 0 && to.spread > 0 ? to.spread / from.spread : 1;
        return {scale: scale, translateX: to.x - (scale * from.x), translateY: to.y - (scale * from.y)};
    }

    function show(change) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = "black";
        context.fillRect(0, 0, overlay.width, overlay.height);
        context.setTransform(change.scale, 0, 0, change.scale, change.translateX, change.translateY);
        context.drawImage(image, 0, 0);
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // The fingers down have changed, so what they have done so far becomes part of the base, and the
    // ones down now start again from where they are.
    function restartFingers(touches) {
        base = compose(base, current);
        current = identity();
        fingers = Array.from(touches, positionOf).slice(0, 2);
    }

    function finish() {
        const change = compose(base, current);
        base = identity();
        current = identity();
        fingers = [];
        if (!moved) {
            return;
        }
        moved = false;
        // The image stays as it was left until the new one is drawn over it.
        const imageContext = image.getContext("2d");
        imageContext.drawImage(overlay, 0, 0);
        context.clearRect(0, 0, overlay.width, overlay.height);
        onTransform(change);
    }

    overlay.addEventListener("touchstart", function (e) {
        if (!enabled()) return;
        e.preventDefault();
        restartFingers(e.touches);
    }, {passive: false});

    overlay.addEventListener("touchmove", function (e) {
        if (!enabled() || fingers.length === 0) return;
        e.preventDefault();
        const now = Array.from(e.touches, positionOf);
        current = changeSinceStart(now);
        const total = compose(base, current);
        const wandered = Math.hypot(total.translateX, total.translateY) > tapSlop || Math.abs(total.scale - 1) > 0.02;
        if (moved || wandered) {
            moved = true;
            show(total);
        }
    }, {passive: false});

    function touchEnd(e) {
        if (!enabled() || fingers.length === 0) return;
        e.preventDefault();
        const wasTap = !moved && e.touches.length === 0 && fingers.length === 1;
        const tap = wasTap ? {time: e.timeStamp, x: fingers[0].x, y: fingers[0].y} : null;
        if (e.touches.length === 0) {
            finish();
        } else {
            restartFingers(e.touches);
        }
        if (tap) {
            if (lastTap && tap.time - lastTap.time < doubleTapMs && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 3 * tapSlop) {
                lastTap = null;
                onDoubleTap();
            } else {
                lastTap = tap;
            }
        }
    }
    overlay.addEventListener("touchend", touchEnd, {passive: false});
    overlay.addEventListener("touchcancel", touchEnd, {passive: false});
}
