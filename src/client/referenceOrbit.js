import { needsPerturbation } from "./precision.js";
import { fromNumber, rescale, toNumber } from "./fixed.js";

// The reference orbit for the view: the orbit of one point, worked out exactly in a worker of its own
// (made by newWorker) for views where needed(view) is true, those past the precision limit of doubles,
// where the renderer iterates pixels as small differences from it. The point is the centre of the view
// until rereference() moves it. It starts again when the view moves, and is worked out ahead of
// rendering: initialLength values to begin with, then twice the depth reached, but no more than
// longest(view) unless asked for (the GPU renderer can't use more than gpuLongestOrbit).
//
// With searchRadius (in pixels), a second worker looks for the nucleus of a mini Mandelbrot set within
// that distance of the centre (see nucleus.js) as the view starts, and if it finds one, the orbit starts
// again from there: one that never escapes, and one period of which is all there is to work out.
//
// Fires referenceOrbitGrew {generation, from, values, length, escaped, complete, period, loopTo} with each chunk
// of values that arrives, and referenceChanged {generation, offsetX, offsetY} when the orbit starts again
// for another point (from rereference() or a nucleus).
//
// values() is the orbit so far, a Float64Array of x, y pairs: Z0 = 0, Z1 = c, ... up to and including
// the value that escapes (|Z| > 2), if it has, or Zp (0, or as near as makes no odds) for a nucleus of
// period p. Either way the orbit is complete(): pixels go back to its start on reaching its end, and
// there is no more of it. It is complete too once a value comes round again (see createOrbitCalculator),
// and then loopTo() is the index of the value the last is the same as, which pixels carry on from on
// reaching the end; otherwise it is -1. offset() is where its point is, in pixels from the view's centre.
export function createReferenceOrbit({events, newWorker, needed = needsPerturbation, initialLength = 4096, searchRadius = 0,
        longest = () => Infinity}) {
    let worker = null;
    let searchWorker = null;
    let viewGeneration = 0;     // bumped for each view, which the nucleus search goes by
    let generation = 0;
    let active = false;
    let view = null;            // the view the orbit is for
    let point = null;           // {x, y, bits} of the orbit's point
    let offset = {x: 0, y: 0};
    let values = new Float64Array(0);
    let length = 0;
    let escaped = false;
    let period = 0;             // the period of the orbit's point, if it is a nucleus
    let complete = false;       // whether the orbit has escaped, or has all of its period, or loops
    let loopTo = -1;
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
        complete = chunk.complete;
        loopTo = chunk.loopTo;
        events.fire(events.referenceOrbitGrew, {generation, from: chunk.from, values: chunk.values, length, escaped, complete, period, loopTo});
        settleWaiting();
    }

    function snapshot() {
        return {generation, values: values.slice(0, 2 * length), escaped, complete, loopTo, offset};
    }

    // Those waiting for a length they now have, or that the orbit is complete short of, get it.
    function settleWaiting() {
        waiting = waiting.filter(function (wait) {
            if (complete || length >= wait.length) {
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

    // Starts the orbit for newPoint {x, y, bits, period}, offset pixels from the view's centre; period is
    // there for a nucleus.
    function start(newPoint, newOffset) {
        abandonWaiting();
        generation += 1;
        length = 0;
        escaped = false;
        complete = false;
        loopTo = -1;
        period = newPoint.period || 0;
        point = newPoint;
        offset = newOffset;
        // A nucleus's whole period is wanted at once: it is complete only then.
        requested = period ? period + 1 : initialLength;
        ask({start: point, length: requested});
    }

    function search(forView) {
        if (!searchWorker) {
            searchWorker = newWorker();
            searchWorker.onmessage = found;
        }
        searchWorker.postMessage({workerMessageType: "nucleus", generation: viewGeneration, x: forView.x, y: forView.y,
            bits: forView.bits, pixelSize: forView.pixelSize, radius: searchRadius});
    }

    // A nucleus for the view, unless it has changed since: the orbit starts again from there.
    function found(e) {
        const nucleus = e.data.nucleus;
        if (!nucleus || nucleus.generation !== viewGeneration || nucleus.period === undefined || !active || period) {
            return;
        }
        const pixelSize = view.pixelSize;
        const dx = toNumber(rescale(nucleus.x, nucleus.bits, view.bits) - view.x, view.bits) / pixelSize;
        const dy = toNumber(rescale(nucleus.y, nucleus.bits, view.bits) - view.y, view.bits) / pixelSize;
        start({x: nucleus.x, y: nucleus.y, bits: nucleus.bits, period: nucleus.period}, {x: dx, y: dy});
        events.fire(events.referenceChanged, {generation, offsetX: dx, offsetY: dy});
    }

    const sameView = (newView) => view !== null && newView.x === view.x && newView.y === view.y && newView.bits === view.bits;

    events.listenTo(events.viewChanged, function (newView) {
        // Views from the render check have no centre, and a resize keeps the same one, unless the orbit is
        // needed for it now and wasn't before (the GPU renderer has taken it over).
        if (newView.x === undefined || (sameView(newView) && active === needed(newView))) {
            return;
        }
        view = newView;
        viewGeneration += 1;
        active = needed(newView);
        if (active) {
            start({x: newView.x, y: newView.y, bits: newView.bits}, {x: 0, y: 0});
            if (searchRadius > 0) {
                search(newView);
            }
        } else {
            abandonWaiting();
            generation += 1;
            length = 0;
            escaped = false;
            complete = false;
            loopTo = -1;
            period = 0;
            point = null;
        }
    });

    events.listenTo(events.depthReached, function (depth) {
        if (active && !complete && 2 * depth > requested && requested < longest(view)) {
            requested = Math.min(longest(view), Math.max(2 * depth, 2 * requested));
            ask({length: requested});
        }
    });

    return {
        active: () => active,
        generation: () => generation,
        length: () => length,
        escaped: () => escaped,
        complete: () => complete,
        loopTo: () => loopTo,
        period: () => period,
        values: () => values.subarray(0, 2 * length),
        offset: () => offset,
        // Asks for the orbit to be worked out to at least length values, if it isn't being already.
        want: function (wanted) {
            if (active && !complete && wanted > requested) {
                requested = Math.max(wanted, Math.min(longest(view), 2 * requested));
                ask({length: requested});
            }
        },
        // A promise of the orbit worked out to at least length values (or until it escapes), as
        // {generation, values, escaped, complete, loopTo, offset}, or null if the view changes first.
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
            if (searchWorker) {
                searchWorker.terminate();
            }
        }
    };
}
