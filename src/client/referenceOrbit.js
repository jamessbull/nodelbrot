import { needsPerturbation } from "./precision.js";
import { fromNumber } from "./fixed.js";

// The reference orbit for the view: the orbit of one point, worked out exactly in a worker of its own
// (made by newWorker) for views where needed(view) is true, those past the precision limit of doubles,
// where the renderer iterates pixels as small differences from it. The point is the centre of the view
// until rereference() moves it. It starts again when the view moves, and is worked out ahead of
// rendering: initialLength values to begin with, then twice the depth reached.
//
// Fires referenceOrbitGrew {generation, from, values, length, escaped} with each chunk of values that
// arrives, and referenceChanged {generation, offsetX, offsetY} when rereference() starts an orbit for
// another point.
//
// values() is the orbit so far, a Float64Array of x, y pairs: Z0 = 0, Z1 = c, ... up to and including
// the value that escapes (|Z| > 2), if it has. offset() is where its point is, in pixels from the view's
// centre.
export function createReferenceOrbit({events, newWorker, needed = needsPerturbation, initialLength = 4096}) {
    let worker = null;
    let generation = 0;
    let active = false;
    let view = null;            // the view the orbit is for
    let point = null;           // {x, y, bits} of the orbit's point
    let offset = {x: 0, y: 0};
    let values = new Float64Array(0);
    let length = 0;
    let escaped = false;
    let requested = 0;          // the length the worker has been asked for
    let waiting = [];           // {length, resolve} for whenLength

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
        events.fire(events.referenceOrbitGrew, {generation, from: chunk.from, values: chunk.values, length, escaped});
        settleWaiting();
    }

    function snapshot() {
        return {generation, values: values.slice(0, 2 * length), escaped, offset};
    }

    // Those waiting for a length they now have, or that the orbit has escaped short of, get it.
    function settleWaiting() {
        waiting = waiting.filter(function (wait) {
            if (escaped || length >= wait.length) {
                wait.resolve(snapshot());
                return false;
            }
            return true;
        });
    }

    // The orbit waited for is gone, for another view or point.
    function abandonWaiting() {
        waiting.forEach((wait) => wait.resolve(null));
        waiting = [];
    }

    function ask(message) {
        if (!worker) {
            worker = newWorker();
            worker.onmessage = receive;
        }
        worker.postMessage(Object.assign({workerMessageType: "referenceorbit", generation}, message));
    }

    function start(newPoint, newOffset) {
        abandonWaiting();
        generation += 1;
        length = 0;
        escaped = false;
        point = newPoint;
        offset = newOffset;
        requested = initialLength;
        ask({start: point, length: requested});
    }

    const sameView = (newView) => view !== null && newView.x === view.x && newView.y === view.y && newView.bits === view.bits;

    events.listenTo(events.viewChanged, function (newView) {
        // Views from the render check have no centre, and a resize keeps the same one.
        if (newView.x === undefined || sameView(newView)) {
            return;
        }
        view = newView;
        active = needed(newView);
        if (active) {
            start({x: newView.x, y: newView.y, bits: newView.bits}, {x: 0, y: 0});
        } else {
            abandonWaiting();
            generation += 1;
            length = 0;
            escaped = false;
            point = null;
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
        generation: () => generation,
        length: () => length,
        escaped: () => escaped,
        values: () => values.subarray(0, 2 * length),
        offset: () => offset,
        // Asks for the orbit to be worked out to at least length values, if it isn't being already.
        want: function (wanted) {
            if (active && !escaped && wanted > requested) {
                requested = Math.max(wanted, 2 * requested);
                ask({length: requested});
            }
        },
        // A promise of the orbit worked out to at least length values (or until it escapes), as
        // {generation, values, escaped, offset}, or null if the view changes first.
        whenLength: function (wanted) {
            return new Promise(function (resolve) {
                waiting.push({length: wanted, resolve});
                if (wanted > requested) {
                    requested = wanted;
                    ask({length: requested});
                }
                settleWaiting();
            });
        },
        // Starts again from the point dx, dy pixels from the view's centre, worked out exactly.
        rereference: function (dx, dy) {
            const bits = view.bits;
            const x = view.x + fromNumber(dx * view.pixelSize, bits);
            const y = view.y + fromNumber(dy * view.pixelSize, bits);
            start({x, y, bits}, {x: dx, y: dy});
            events.fire(events.referenceChanged, {generation, offsetX: dx, offsetY: dy});
        },
        dispose: function () {
            if (worker) {
                worker.terminate();
            }
        }
    };
}
