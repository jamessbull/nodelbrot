import { bitsFor, fromDecimal, rescale, toNumber } from "../src/client/fixed.js";
import { createOrbitCalculator } from "../src/client/worker/referenceOrbit.js";
import { createOrbitStore, createPerturbationIterator } from "../src/client/worker/perturbationIterator.js";
import { nucleusSearch } from "../src/client/worker/nucleus.js";
import { buildBla, minLevel } from "../src/client/worker/bla.js";

// A width x height grid around (x, y), pixelSize apart, by perturbation from the orbit of the nucleus
// the search finds there, as the explorer would render it.
function grid(x, y, pixelSize, width, height) {
    const bits = bitsFor(pixelSize);
    const cx = fromDecimal(x, bits), cy = fromDecimal(y, bits);
    const search = nucleusSearch({x: cx, y: cy, bits, pixelSize, radius: 1000});
    let step = search.next();
    while (!step.done) step = search.next();
    const found = step.value;
    const orbit = createOrbitStore();
    const calculator = createOrbitCalculator(found.x, found.y, found.bits);
    orbit.add(0, 0, calculator.next(found.period + 1), true);
    const dx = toNumber(rescale(found.x, found.bits, bits) - cx, bits) / pixelSize;
    const dy = toNumber(rescale(found.y, found.bits, bits) - cy, bits) / pixelSize;
    const extents = {mx: (-((width - 1) / 2) - dx) * pixelSize, my: (-((height - 1) / 2) - dy) * pixelSize,
        stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1};
    return {orbit, extents, found};
}

function render({orbit, extents}, width, height, depth, options) {
    const pixels = createPerturbationIterator(width, height, extents, orbit, options);
    const started = Date.now();
    for (let start = 0; start < depth; start += 5000) {
        pixels.iterate(start, Math.min(5000, depth - start), new Uint32Array(5001));
    }
    return {escapes: Array.from(pixels.escapeValues), ms: Date.now() - started};
}

describe("deep zoom shortcuts", function () {
    describe("cycles", function () {
        it("should leave pixels in a mini set without iterating them to the depth, and change nothing", function () {
            // The period 3 mini set off the main one's tail, most of the view.
            const view = grid("-1.7685", "0.0018", 0.002 / 48, 48, 24);
            const plain = render(view, 48, 24, 100000, {cycles: false, bla: false});
            const checked = render(view, 48, 24, 100000, {cycles: true, bla: false});
            expect(checked.escapes).toEqual(plain.escapes);
            expect(plain.escapes.filter((at) => at === 0).length).toBeGreaterThan(400);
            expect(checked.ms).toBeLessThan(plain.ms / 3);
        });

        it("should not take pixels just outside a deep mini set, near its nucleus, to be in it", function () {
            // Their orbits come close to 0 every period for a long while before they escape, which a check
            // on dz/dz would take for a cycle; all of them escape.
            const {found, orbit} = grid("-0.74364388703715869775210999909999300008", "0.13182590420531197349300999970000399993", 1e-28, 64, 32);
            // Centred on the nucleus, three times as wide as the mini set: about 1 / |L|^2, L being the
            // product of 2 Zi round its cycle (see nucleus.js).
            let log2L = 0;
            for (let i = 1; i < found.period; i += 1) {
                log2L += 1 + Math.log2(Math.hypot(orbit.values[2 * i], orbit.values[(2 * i) + 1]));
            }
            const pixelSize = (2 ** (-2 * log2L)) * 3 * 2 / 32;
            const extents = {mx: -(31 / 2) * pixelSize, my: -(15 / 2) * pixelSize, stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1};
            expect(found.period).toBeGreaterThan(8000);
            const plain = render({orbit, extents}, 32, 16, 100000, {cycles: false, bla: false});
            const checked = render({orbit, extents}, 32, 16, 100000, {cycles: true, bla: false});
            expect(checked.escapes).toEqual(plain.escapes);
            expect(plain.escapes.filter((at) => at > 0).length).toBeGreaterThan(0.9 * plain.escapes.length);
        });
    });

    describe("bivariate linear approximation", function () {
        it("should take d through a run as iterating does, while d is within R", function () {
            const bits = 192;
            const calculator = createOrbitCalculator(fromDecimal("-0.743643887037158704752191506114774", bits),
                fromDecimal("0.131825904205311970493132056385139", bits), bits);
            const values = calculator.next(4096);
            const dcMax = 1e-40;
            const {levels} = buildBla(values, 4096, dcMax);
            // The first run of 2^(minLevel + 2) that d can be in.
            const level = 2;
            const run = (2 ** minLevel) << level;
            let j = 0;
            while (levels[level][(5 * j) + 4] === 0) j += 1;
            const at = 5 * j;
            const [ax, ay, bx, by, r] = levels[level].slice(at, at + 5);
            expect(r).toBeGreaterThan(0);
            const dcx = 0.6 * dcMax, dcy = -0.7 * dcMax;
            let dx = 0.5 * r, dy = 0.5 * r;
            const linearX = (ax * dx) - (ay * dy) + (bx * dcx) - (by * dcy);
            const linearY = (ax * dy) + (ay * dx) + (bx * dcy) + (by * dcx);
            for (let m = 1 + (j * run); m < 1 + ((j + 1) * run); m += 1) {
                const zx = values[2 * m], zy = values[(2 * m) + 1];
                const nextDx = (2 * ((zx * dx) - (zy * dy))) + ((dx * dx) - (dy * dy)) + dcx;
                dy = (2 * ((zx * dy) + (zy * dx) + (dx * dy))) + dcy;
                dx = nextDx;
            }
            expect(Math.abs(linearX - dx)).toBeLessThan(1e-12 * Math.hypot(dx, dy));
            expect(Math.abs(linearY - dy)).toBeLessThan(1e-12 * Math.hypot(dx, dy));
        });

        it("should count escapes as iterating does, but for a few pixels too fine to pin down, deep in", function () {
            const views = [
                ["-0.74364388703715869775210999909999300008", "0.13182590420531197349300999970000399993", 1e-28],
                ["-0.743643887037158697752109999099993000080000600001999990000699993",
                    "0.131825904205311973493009999700003999930000000009000049999099999", 1e-63]
            ];
            views.forEach(function ([x, y, size]) {
                const view = grid(x, y, size * 400 / 48, 48, 24);
                const plain = render(view, 48, 24, 50000, {cycles: false, bla: false});
                const fast = render(view, 48, 24, 50000, {cycles: false, bla: true});
                const differ = plain.escapes.filter((at, i) => at !== fast.escapes[i]).length;
                // As many as moving the pixels by a rounding error would change (see gpuCheck.html).
                expect(differ).withContext("pixel size " + size).toBeLessThan(0.01 * plain.escapes.length);
            });
        });
    });
});
