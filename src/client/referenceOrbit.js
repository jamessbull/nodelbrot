import { isNearLimit } from "./precision.js";

// The reference orbit for the view: the orbit of the point at its centre, worked out exactly in a worker
// of its own (made by newWorker) for views where needed(view) is true, those past the precision limit
// of doubles, where the renderer will iterate pixels as small differences from it. It starts again when
// the view moves, and is worked out ahead of rendering: initialLength values to begin with, then twice
// the depth reached. Fires referenceOrbitGrew {length, escaped} as values arrive.
//
// values() is the orbit so far, a Float64Array of x, y pairs: Z0 = 0, Z1 = c, ... up to and including
// the value that escapes (|Z| > 2), if it has.
export function createReferenceOrbit({events, newWorker, needed = isNearLimit, initialLength = 4096}) {
    let worker = null;
    let generation = 0;
    let active = false;
    let centre = null;          // {x, y, bits} of the orbit's point
    let values = new Float64Array(0);
    let length = 0;
    let escaped = false;
    let requested = 0;          // the length the worker has been asked for

    function receive(e) {
        const chunk = e.data.referenceOrbit;
        if (!chunk || chunk.generation !== generation) {
            return;
        }
        const end = (2 * chunk.from) + chunk.values.length;
        if (end > values.length) {
            const grown = new Float64Array(Math.max(end, 2 * values.length));
            grown.set(values.subarray(0, 2 * length));
            values = grown;
        }
        values.set(chunk.values, 2 * chunk.from);
        length = end / 2;
        escaped = chunk.escaped;
        events.fire(events.referenceOrbitGrew, {length, escaped});
    }

    function ask(message) {
        if (!worker) {
            worker = newWorker();
            worker.onmessage = receive;
        }
        worker.postMessage(Object.assign({workerMessageType: "referenceorbit", generation}, message));
    }

    const samePoint = (view) => centre !== null && view.x === centre.x && view.y === centre.y && view.bits === centre.bits;

    events.listenTo(events.viewChanged, function (view) {
        // Views from the render check have no centre, and a resize keeps the same one.
        if (view.x === undefined || samePoint(view)) {
            return;
        }
        generation += 1;
        length = 0;
        escaped = false;
        centre = null;
        active = needed(view);
        if (active) {
            centre = {x: view.x, y: view.y, bits: view.bits};
            requested = initialLength;
            ask({start: centre, length: requested});
        }
    });

    events.listenTo(events.depthReached, function (depth) {
        if (active && !escaped && 2 * depth > requested) {
            requested = Math.max(2 * depth, 2 * requested);
            ask({length: requested});
        }
    });

    return {
        active: () => active,
        length: () => length,
        escaped: () => escaped,
        values: () => values.subarray(0, 2 * length),
        dispose: function () {
            if (worker) {
                worker.terminate();
            }
        }
    };
}
