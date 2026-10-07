import { bitsFor, fromDecimal, fromNumber } from "../src/client/fixed.js";
import { createOrbitCalculator } from "../src/client/worker/referenceOrbit.js";
import { createOrbitStore, createPerturbationIterator } from "../src/client/worker/perturbationIterator.js";
import { escapesPast } from "../src/client/rereference.js";
import { createPixelIterator } from "../src/client/worker/pixelIterator.js";

// The iteration at which |z|^2 first passes 16, counted as the renderer counts (n where z(n-1) passed),
// worked out exactly in fixed point for c = (x, y), or 0 if not by maxIterations.
function exactEscape(x, y, bits, maxIterations) {
    const shift = BigInt(bits);
    const sixteen = 16n << (2n * shift);
    let zx = 0n, zy = 0n;
    for (let n = 1; n <= maxIterations; n += 1) {
        const xx = zx * zx, yy = zy * zy;
        if (xx + yy > sixteen) return n;
        const xy = zx * zy;
        zx = ((xx - yy) >> shift) + x;
        zy = (xy >> (shift - 1n)) + y;
    }
    return 0;
}

// A row of width pixels pixelSize apart, centred on (x, y), rendered by perturbation from the orbit of
// the centre, to maxIterations in frames of step iterations.
function perturbed(x, y, pixelSize, width, maxIterations, step) {
    const bits = bitsFor(pixelSize);
    const orbit = createOrbitStore();
    const calculator = createOrbitCalculator(fromDecimal(x, bits), fromDecimal(y, bits), bits);
    orbit.add(0, 0, calculator.next(maxIterations + 2), calculator.escaped());
    const extents = {mx: -((width - 1) / 2) * pixelSize, my: 0, stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1};
    const pixels = createPerturbationIterator(width, 1, extents, orbit);
    for (let start = 0; start < maxIterations; start += step) {
        pixels.iterate(start, Math.min(step, maxIterations - start), new Uint32Array(step));
    }
    return {pixels, bits};
}

describe("perturbation", function () {
    it("should count the same escapes as iterating directly, where doubles are precise enough", function () {
        const width = 200, pixelSize = 0.0002, maxIterations = 3000;
        const {pixels} = perturbed("-0.7436", "0.1318", pixelSize, width, maxIterations, 97);
        const direct = createPixelIterator(width, 1, {mx: -0.7436 - (((width - 1) / 2) * pixelSize), my: 0.1318,
            stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1});
        for (let start = 0; start < maxIterations; start += 97) {
            direct.iterate(start, Math.min(97, maxIterations - start), new Uint32Array(97));
        }
        let same = 0;
        for (let i = 0; i < width; i += 1) {
            if (pixels.escapeValues[i] === direct.escapeValues[i]) same += 1;
        }
        // Rounding differs, so a pixel right on the edge of a band can come out one different.
        expect(same / width).toBeGreaterThan(0.97);
    });

    // Places on the boundary, found by zooming in on the deepest pixel again and again from seahorse
    // valley, where every pixel of a row escapes, at 8,000 to 13,000 iterations.
    const deepPlaces = [
        ["1e-20", "-0.743643887037158704752191506114774", "0.131825904205311970493132056385139", 1e-20],
        ["1e-38", "-0.74364388703715869775210999909999300008", "0.13182590420531197349300999970000399993", 1e-38],
        ["1e-63", "-0.743643887037158697752109999099993000080000600001999990000699993",
            "0.131825904205311973493009999700003999930000000009000049999099999", 1e-63]
    ];
    deepPlaces.forEach(function ([name, x, y, pixelSize]) {
        it("should count escapes as exact calculation does at " + name + ", where doubles alone can't tell pixels apart", function () {
            const width = 41, maxIterations = 15000;
            const {pixels, bits} = perturbed(x, y, pixelSize, width, maxIterations, 1013);
            const cx = fromDecimal(x, bits), cy = fromDecimal(y, bits);
            let same = 0, escaped = 0;
            for (let i = 0; i < width; i += 1) {
                // The exact count for the very point the renderer used for the pixel.
                const dc = -(((width - 1) / 2) * pixelSize) + (i * pixelSize);
                const exact = exactEscape(cx + fromNumber(dc, bits), cy, bits, maxIterations);
                if (exact !== 0) escaped += 1;
                if (pixels.escapeValues[i] === exact) same += 1;
            }
            // So the check means something, most pixels must escape.
            expect(escaped).toBeGreaterThan(width / 2);
            // Some pixels sit on detail far finer than the pixel, where moving by a millionth of a pixel
            // changes the count by hundreds, and rounding is enough to: their counts can't be pinned down
            // by any means. All the rest must be exact.
            expect(same).toBeGreaterThanOrEqual(width - 3);
        });
    });

    it("should be right for pixels whose orbits outlast an escaping reference", function () {
        // The centre escapes early, but its neighbours go on far longer.
        const x = "-0.75", y = "0.0001";
        const pixelSize = 1e-6, width = 21, maxIterations = 30000;
        const {pixels, bits} = perturbed(x, y, pixelSize, width, maxIterations, 1000);
        const cx = fromDecimal(x, bits), cy = fromDecimal(y, bits);
        for (let i = 0; i < width; i += 1) {
            const exact = exactEscape(cx + fromNumber((i - 10) * pixelSize, bits), cy, bits, maxIterations);
            expect(Math.abs(pixels.escapeValues[i] - exact)).withContext("pixel " + i).toBeLessThanOrEqual(1);
        }
    });

    it("should carry on right from a new reference orbit, keeping the pixels that had escaped", function () {
        const x = "-0.75", y = "0.0001";
        const pixelSize = 1e-6, width = 21, switchAt = 5000, maxIterations = 30000;
        const bits = bitsFor(pixelSize);
        const cx = fromDecimal(x, bits), cy = fromDecimal(y, bits);
        // Rendered from the centre's orbit, which escapes early, to switchAt.
        const store = createOrbitStore();
        const centre = createOrbitCalculator(cx, cy, bits);
        store.add(0, 0, centre.next(switchAt + 2), centre.escaped());
        const extents = {mx: -((width - 1) / 2) * pixelSize, my: 0, stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1};
        const pixels = createPerturbationIterator(width, 1, extents, store);
        for (let start = 0; start < switchAt; start += 1000) {
            pixels.iterate(start, 1000, new Uint32Array(1000));
        }
        const before = Array.from(pixels.escapeValues);
        // Then from the orbit of a point 7 pixels left of the centre, as re-referencing would choose, back
        // from the start for the pixels still going, as the renderers do.
        const offset = -7;
        const next = createOrbitCalculator(cx + fromNumber(offset * pixelSize, bits), cy, bits);
        store.add(1, 0, next.next(maxIterations + 2), next.escaped());
        pixels.restartSurvivors(Object.assign({}, extents, {mx: (-((width - 1) / 2) - offset) * pixelSize}));
        for (let start = 0; start < maxIterations; start += 1000) {
            pixels.iterate(start, 1000, new Uint32Array(1000));
        }
        for (let i = 0; i < width; i += 1) {
            if (before[i] !== 0) {
                expect(pixels.escapeValues[i]).withContext("pixel " + i + " had escaped").toBe(before[i]);
            }
            const exact = exactEscape(cx + fromNumber((i - 10) * pixelSize, bits), cy, bits, maxIterations);
            expect(Math.abs(pixels.escapeValues[i] - exact)).withContext("pixel " + i).toBeLessThanOrEqual(1);
        }
        expect(before.filter((at) => at === 0).length).withContext("pixels still going at the switch").toBeGreaterThan(3);
    });

    it("should pass on only the escapes past the depth caught up to", function () {
        const update = Uint32Array.from([1, 2, 3, 4]);
        expect(escapesPast(update, 10, 0)).toEqual({update, currentIteration: 10});
        expect(escapesPast(update, 10, 14)).toBeNull();
        const part = escapesPast(update, 10, 12);
        expect(Array.from(part.update)).toEqual([3, 4]);
        expect(part.currentIteration).toBe(12);
    });
});
