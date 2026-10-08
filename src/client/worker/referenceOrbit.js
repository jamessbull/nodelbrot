import { toNumber } from "../fixed.js";

// The orbit of one point c = x + iy (BigInts with bits binary places, as in a view), worked out exactly
// in fixed point: Z0 = 0, Zn+1 = Zn^2 + c. Each Zn is kept as a double pair, which is all the pixels near
// c need from it (see perturbation, to come). next(count) works out up to count more and returns them as
// a Float64Array of x, y pairs, ending early if the orbit escapes (|Z| > 2): the escaping value is the
// last. escaped() says whether it has, and length() how many values there are so far.
//
// With findLoop, it also ends once a value comes round again exactly, fixed point and all, as it can for
// a point in the set once its orbit has been drawn into its cycle (Brent's method, as in
// pixelIterator.js): the last value is the same as the one at loopTo(), and so is all that follows, so
// pixels can carry on from there (see perturbationIterator.js). Otherwise loopTo() is -1. (Values that
// are only the same as doubles won't do: the difference, however small, is far bigger than d deep in.)
export function createOrbitCalculator(x, y, bits, {findLoop = false} = {}) {
    const shift = BigInt(bits);
    const escapeRadiusSquared = 4n << (2n * shift);     // |Z|^2 > 4, with 2 * bits places
    let zx = 0n;
    let zy = 0n;
    let xx = 0n;            // zx^2 and zy^2, kept from the escape test for the next step
    let yy = 0n;
    let length = 0;
    let escaped = false;
    let loopTo = -1;
    // The value kept to look for it coming round again, its index, and when it is next replaced.
    let keptX = null;
    let keptY = null;
    let keptAt = 0;
    let window = 1;

    return {
        next: function (count) {
            const values = new Float64Array(2 * count);
            let made = 0;
            while (made < count && !escaped && loopTo < 0) {
                if (length > 0) {
                    const xy = zx * zy;
                    zx = ((xx - yy) >> shift) + x;
                    zy = (xy >> (shift - 1n)) + y;      // 2xy, as a shift one less
                }
                values[2 * made] = toNumber(zx, bits);
                values[(2 * made) + 1] = toNumber(zy, bits);
                made += 1;
                length += 1;
                if (findLoop) {
                    if (zx === keptX && zy === keptY) {
                        loopTo = keptAt;
                    } else if (length - 1 - keptAt >= window) {
                        keptX = zx;
                        keptY = zy;
                        keptAt = length - 1;
                        window *= 2;
                    }
                }
                xx = zx * zx;
                yy = zy * zy;
                if (xx + yy > escapeRadiusSquared) {
                    escaped = true;
                }
            }
            return made === count ? values : values.slice(0, 2 * made);
        },
        escaped: () => escaped,
        loopTo: () => loopTo,
        length: () => length
    };
}

// The worker side of reference orbits, for a dedicated worker. A message {start: {x, y, bits, period},
// length, generation} starts a new orbit for c = x + iy (with period for a nucleus, whose orbit is worked
// out to Zperiod and no further); {length, generation} asks for the orbit to be worked out to at least
// that length. The orbit is worked out a slice at a time, so new messages are read between slices, and
// each slice goes back to postMessage as {referenceOrbit: {generation, from, values, escaped, complete,
// loopTo}} (values transferred), from being the index of its first value, complete saying there's no
// more, and loopTo where pixels carry on from at the end, for an orbit that has come round again (see
// createOrbitCalculator), or -1. Messages for an older generation than the latest are ignored. Slices are about sliceMs long, and schedule(next) runs the next one after any
// waiting messages (the render check passes its own, to be deterministic).
export function createReferenceOrbitWorker(postMessage, {sliceMs = 20, schedule = (next) => setTimeout(next, 0)} = {}) {
    let calculator = null;
    let generation = -1;
    let target = 0;
    let end = Infinity;         // the length of a nucleus's orbit
    let working = false;

    const complete = () => calculator.escaped() || calculator.loopTo() >= 0 || calculator.length() >= end;

    function work() {
        working = false;
        if (!calculator || complete() || calculator.length() >= target) {
            return;
        }
        const from = calculator.length();
        const started = Date.now();
        const slices = [];
        let made = 0;
        // Batches of 64 between looks at the clock.
        while (Date.now() - started < sliceMs && calculator.length() < target && !complete()) {
            const values = calculator.next(Math.min(64, target - calculator.length(), end - calculator.length()));
            slices.push(values);
            made += values.length;
        }
        const values = new Float64Array(made);
        let at = 0;
        slices.forEach((slice) => { values.set(slice, at); at += slice.length; });
        postMessage({referenceOrbit: {generation, from, values, escaped: calculator.escaped(), complete: complete(),
            loopTo: calculator.loopTo()}}, [values.buffer]);
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
            if (msg.start) {
                calculator = createOrbitCalculator(msg.start.x, msg.start.y, msg.start.bits, {findLoop: !msg.start.period});
                generation = msg.generation;
                target = 0;
                end = msg.start.period ? msg.start.period + 1 : Infinity;
            }
            target = Math.max(target, msg.length);
            scheduleWork();
        }
    };
}
