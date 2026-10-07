import { fromNumber, rescale, toNumber } from "../fixed.js";
import { createOrbitCalculator } from "./referenceOrbit.js";

// Looks for a better reference point for a view than its centre, whose orbit may escape (see
// rereference.js): the nucleus of a mini Mandelbrot set (or bulb) near it. A nucleus c of period p has
// Zp = 0, so its orbit goes round and round and never escapes, and p + 1 values of it are all the
// pixels need (they carry on from the start when they reach the end, where Z is 0 again).
//
// The period comes from following the orbit of the view's centre (x, y, with bits binary places) along
// with its derivative dZ/dc: the disc of radius radius pixels (each pixelSize) around the centre is
// carried by n iterations to about a disc of radius |dZn/dc| times as big around Zn, and the first n for
// which that contains 0 is the period of a nucleus that may be in the disc (the ball method). Newton's
// method then looks for c with Zp(c) = 0, starting from the centre. If it doesn't settle, or settles
// outside the disc, the search goes on to the next n that might be a period.
//
// A generator, so the work can be done in slices: it yields every so often, and returns {x, y, bits,
// period} (x and y fixed point with bits places, which may be more than the view's: see newton) or null
// if there's nothing found within budget iterations, or before the centre's orbit escapes.
export function* nucleusSearch({x, y, bits, pixelSize, radius, budget = 20000000}) {
    const log2Radius = Math.log2(radius * pixelSize);
    const limit = fromNumber(radius * pixelSize, bits);
    const orbit = createOrbitCalculator(x, y, bits);
    const spent = {iterations: 0};
    // dZ/dc is (dx, dy) * 2^scale, as it can grow past a double's range.
    let dx = 0;
    let dy = 0;
    let scale = 0;
    let previousX = 0;
    let previousY = 0;
    let n = 0;
    while (spent.iterations < budget) {
        const values = orbit.next(1024);
        for (let i = 0; i < values.length; i += 2) {
            const zx = values[i];
            const zy = values[i + 1];
            if (n > 0) {
                const nextDx = (2 * ((previousX * dx) - (previousY * dy))) + (2 ** -scale);
                dy = 2 * ((previousX * dy) + (previousY * dx));
                dx = nextDx;
                if (Math.abs(dx) + Math.abs(dy) > 2 ** 100) {
                    dx *= 2 ** -100;
                    dy *= 2 ** -100;
                    scale += 100;
                }
                if (Math.log2(Math.hypot(zx, zy)) < Math.log2(Math.hypot(dx, dy)) + scale + log2Radius) {
                    const nucleus = yield* newton(x, y, bits, pixelSize, n, limit, spent);
                    if (nucleus) {
                        return Object.assign(nucleus, {period: n});
                    }
                }
            }
            previousX = zx;
            previousY = zy;
            n += 1;
        }
        spent.iterations += values.length / 2;
        if (orbit.escaped()) {
            return null;
        }
        yield;
    }
    return null;
}

// c near (x0, y0) with Zperiod(c) = 0, by Newton's method in fixed point, as {x, y, bits}, or null if it
// doesn't settle in a few dozen steps, or strays further than limit from where it started.
//
// The mini set round a nucleus is about 1 / |L|^2 across, L being the product of 2 Zi round the cycle
// (the atom size estimate, less a factor near 1). That can be far smaller than a pixel, and the nucleus
// must be found, and its orbit worked out, to well within it, or the orbit escapes after all. So the
// places used grow, from the view's bits, to 64 more than that size needs.
function* newton(x0, y0, bits, pixelSize, period, viewLimit, spent) {
    const abs = (n) => (n < 0n ? -n : n);
    let places = bits;
    let cx = x0;
    let cy = y0;
    for (let step = 0; step < 48; step += 1) {
        const shift = BigInt(places);
        const one = 1n << shift;
        const bound = 1024n << shift;
        let zx = 0n;
        let zy = 0n;
        let dx = 0n;
        let dy = 0n;
        let log2Multiplier = 0;     // log2 |2 Z1 2 Z2 ... 2 Zp-1|
        for (let i = 1; i <= period; i += 1) {
            // dZ/dc = 2 Z dZ/dc + 1, from the Z before, then Z = Z^2 + c.
            const nextDx = (((zx * dx) - (zy * dy)) >> (shift - 1n)) + one;
            dy = ((zx * dy) + (zy * dx)) >> (shift - 1n);
            dx = nextDx;
            const nextZx = (((zx * zx) - (zy * zy)) >> shift) + cx;
            zy = ((zx * zy) >> (shift - 1n)) + cy;
            zx = nextZx;
            if (abs(zx) > bound || abs(zy) > bound) {
                return null;
            }
            if (i < period) {
                log2Multiplier += 1 + Math.log2(Math.hypot(toNumber(zx, places), toNumber(zy, places)));
            }
            if ((i & 1023) === 0) {
                spent.iterations += 1024;
                yield;
            }
        }
        spent.iterations += period & 1023;
        // log2 of the mini set's size, roughly, and the places that needs.
        const log2Size = -2 * Math.max(0, log2Multiplier);
        const needed = Math.ceil(Math.max(bits, 64 - log2Size) / 32) * 32;
        if (needed > places) {
            cx = rescale(cx, places, needed);
            cy = rescale(cy, places, needed);
            places = needed;
            continue;
        }
        // The step is Z / (dZ/dc) = Z * conj(dZ/dc) / |dZ/dc|^2.
        const size = (dx * dx) + (dy * dy);
        if (size === 0n) {
            return null;
        }
        const stepX = (((zx * dx) + (zy * dy)) << shift) / size;
        const stepY = (((zy * dx) - (zx * dy)) << shift) / size;
        cx -= stepX;
        cy -= stepY;
        const startX = rescale(x0, bits, places);
        const startY = rescale(y0, bits, places);
        const limit = rescale(viewLimit, bits, places);
        if (abs(cx - startX) > limit || abs(cy - startY) > limit) {
            return null;
        }
        // Settled to within a millionth or so of the pixel, and of the mini set.
        const tolerance = [fromNumber(pixelSize * (2 ** -24), places), 1n << BigInt(Math.max(0, Math.floor(places + log2Size - 24)))]
            .reduce((a, b) => (a < b ? a : b));
        if (abs(stepX) <= tolerance && abs(stepY) <= tolerance) {
            return {x: cx, y: cy, bits: places};
        }
    }
    return null;
}

// The worker side of the search, for a worker of its own (the orbits' would be held up by it). A
// message {generation, x, y, bits, pixelSize, radius} starts a search, dropping any going on; the answer
// goes to postMessage as {nucleus: {generation, x, y, period}}, or {nucleus: {generation}} if there's
// none. It is done in slices of about sliceMs, with schedule(next) running the next after any waiting
// messages.
export function createNucleusWorker(postMessage, {sliceMs = 20, schedule = (next) => setTimeout(next, 0)} = {}) {
    let search = null;
    let generation = -1;
    let working = false;

    function work() {
        working = false;
        if (!search) {
            return;
        }
        const started = Date.now();
        while (Date.now() - started < sliceMs) {
            const step = search.next();
            if (step.done) {
                search = null;
                postMessage({nucleus: Object.assign({generation}, step.value)});
                return;
            }
        }
        scheduleWork();
    }

    function scheduleWork() {
        if (!working) {
            working = true;
            schedule(work);
        }
    }

    return {
        onmessage: function (e) {
            const msg = e.data;
            if (msg.generation < generation) {
                return;
            }
            generation = msg.generation;
            search = nucleusSearch(msg);
            scheduleWork();
        }
    };
}
