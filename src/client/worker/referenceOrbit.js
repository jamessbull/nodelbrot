import { toNumber } from "../fixed.js";

// The orbit of one point c = x + iy (BigInts with bits binary places, as in a view), worked out exactly
// in fixed point: Z0 = 0, Zn+1 = Zn^2 + c. Each Zn is kept as a double pair, which is all the pixels near
// c need from it (see perturbation, to come). next(count) works out up to count more and returns them as
// a Float64Array of x, y pairs, ending early if the orbit escapes (|Z| > 2): the escaping value is the
// last. escaped() says whether it has, and length() how many values there are so far.
export function createOrbitCalculator(x, y, bits) {
    const shift = BigInt(bits);
    const escapeRadiusSquared = 4n << (2n * shift);     // |Z|^2 > 4, with 2 * bits places
    let zx = 0n;
    let zy = 0n;
    let xx = 0n;            // zx^2 and zy^2, kept from the escape test for the next step
    let yy = 0n;
    let length = 0;
    let escaped = false;

    return {
        next: function (count) {
            const values = new Float64Array(2 * count);
            let made = 0;
            while (made < count && !escaped) {
                if (length > 0) {
                    const xy = zx * zy;
                    zx = ((xx - yy) >> shift) + x;
                    zy = (xy >> (shift - 1n)) + y;      // 2xy, as a shift one less
                }
                values[2 * made] = toNumber(zx, bits);
                values[(2 * made) + 1] = toNumber(zy, bits);
                made += 1;
                length += 1;
                xx = zx * zx;
                yy = zy * zy;
                if (xx + yy > escapeRadiusSquared) {
                    escaped = true;
                }
            }
            return made === count ? values : values.slice(0, 2 * made);
        },
        escaped: () => escaped,
        length: () => length
    };
}

// The worker side of reference orbits, for a dedicated worker. A message {start: {x, y, bits}, length,
// generation} starts a new orbit for c = x + iy; {length, generation} asks for the orbit to be worked out
// to at least that length. The orbit is worked out a slice at a time, so new messages are read between
// slices, and each slice goes back to postMessage as {referenceOrbit: {generation, from, values, escaped}}
// (values transferred), from being the index of its first value. Messages for an older generation than
// the latest are ignored.
export function createReferenceOrbitWorker(postMessage, sliceMs = 20) {
    let calculator = null;
    let generation = -1;
    let target = 0;
    let working = false;

    function work() {
        working = false;
        if (!calculator || calculator.escaped() || calculator.length() >= target) {
            return;
        }
        const from = calculator.length();
        const started = Date.now();
        const slices = [];
        let made = 0;
        // Batches of 64 between looks at the clock.
        while (Date.now() - started < sliceMs && calculator.length() < target && !calculator.escaped()) {
            const values = calculator.next(Math.min(64, target - calculator.length()));
            slices.push(values);
            made += values.length;
        }
        const values = new Float64Array(made);
        let at = 0;
        slices.forEach((slice) => { values.set(slice, at); at += slice.length; });
        postMessage({referenceOrbit: {generation, from, values, escaped: calculator.escaped()}}, [values.buffer]);
        schedule();
    }

    // The next slice comes after any waiting messages.
    function schedule() {
        if (!working) {
            working = true;
            setTimeout(work, 0);
        }
    }

    return {
        onmessage: function (e) {
            const msg = e.data;
            if (msg.generation < generation) {
                return;
            }
            if (msg.start) {
                calculator = createOrbitCalculator(msg.start.x, msg.start.y, msg.start.bits);
                generation = msg.generation;
                target = 0;
            }
            target = Math.max(target, msg.length);
            schedule();
        }
    };
}
