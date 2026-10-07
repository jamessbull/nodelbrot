import { createEvents } from "../src/client/events.js";
import { bitsFor, fromDecimal, fromNumber, rescale } from "../src/client/fixed.js";
import { viewAt } from "../src/client/view.js";
import { createReferenceOrbit } from "../src/client/referenceOrbit.js";
import { createOrbitCalculator } from "../src/client/worker/referenceOrbit.js";
import { createNucleusWorker, nucleusSearch } from "../src/client/worker/nucleus.js";
import { createOrbitStore, createPerturbationIterator } from "../src/client/worker/perturbationIterator.js";
import { createWorkerHandler } from "../src/client/worker/worker.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function searchAt(x, y, pixelSize) {
    const bits = bitsFor(pixelSize);
    const search = nucleusSearch({x: fromDecimal(x, bits), y: fromDecimal(y, bits), bits, pixelSize, radius: 1000});
    let step = search.next();
    while (!step.done) {
        step = search.next();
    }
    return step.value;
}

const seahorse = ["-0.743643887037158704752191506114774", "0.131825904205311970493132056385139"];

describe("nuclei", function () {
    it("should find the period 3 mini set by the main one's tail", function () {
        const found = searchAt("-1.7548", "0", 1e-6);
        expect(found.period).toBe(3);
        // Its nucleus is at -1.75487766624669276...
        expect(Number(found.x * 10n ** 15n / (1n << BigInt(found.bits))) / 1e15).toBeCloseTo(-1.754877666246693, 14);
        expect(found.y).toBe(0n);
    });

    it("should find nuclei deep down whose orbits never escape, with as many places as that takes", function () {
        const found = searchAt(seahorse[0], seahorse[1], 1e-20);
        expect(found.period).toBeGreaterThan(1000);
        expect(found.bits).toBeGreaterThan(bitsFor(1e-20));
        const orbit = createOrbitCalculator(found.x, found.y, found.bits);
        const values = orbit.next(found.period + 1);
        expect(Math.hypot(values[2 * found.period], values[(2 * found.period) + 1])).toBeLessThan(1e-30);
        orbit.next(100000);
        expect(orbit.escaped()).toBe(false);
    });

    it("should find none where there's no mini set near", function () {
        // Just outside the main cardioid's cusp: the nearest nucleus is 25,000 pixels away.
        expect(searchAt("0.2501", "0", 1e-5)).toBeNull();
    });

    it("should count escapes as exact calculation does, from one period of a nucleus's orbit", function () {
        // Pixels go back to the start of the orbit at the end of each period, where Z is 0.
        const pixelSize = 1e-20, width = 41, maxIterations = 15000;
        const found = searchAt(seahorse[0], seahorse[1], pixelSize);
        const bits = bitsFor(pixelSize);
        const store = createOrbitStore();
        const calculator = createOrbitCalculator(found.x, found.y, found.bits);
        store.add(0, 0, calculator.next(found.period + 1), true);
        const cx = fromDecimal(seahorse[0], bits), cy = fromDecimal(seahorse[1], bits);
        // The row through the centre, as differences from the nucleus.
        const nx = rescale(found.x, found.bits, bits), ny = rescale(found.y, found.bits, bits);
        const toPixels = (n) => Number(n) / Number(fromNumber(pixelSize, bits));
        const extents = {mx: (-((width - 1) / 2) * pixelSize) - (toPixels(nx - cx) * pixelSize), my: -toPixels(ny - cy) * pixelSize,
            stepX: pixelSize, stepY: pixelSize, firstRow: 0, rowStride: 1};
        const pixels = createPerturbationIterator(width, 1, extents, store);
        for (let start = 0; start < maxIterations; start += 1013) {
            pixels.iterate(start, Math.min(1013, maxIterations - start), new Uint32Array(1013));
        }
        let same = 0;
        for (let i = 0; i < width; i += 1) {
            const dc = (i - ((width - 1) / 2)) * pixelSize;
            if (pixels.escapeValues[i] === exactEscape(cx + fromNumber(dc, bits), cy, bits, maxIterations)) same += 1;
        }
        // As for the centre's orbit (see perturbation.spec.js): some pixels' counts can't be pinned down.
        expect(same).toBeGreaterThanOrEqual(width - 3);
    });

    it("should answer from the worker, and drop a search for a newer one", async function () {
        const replies = [];
        const worker = createNucleusWorker((message) => replies.push(message.nucleus), {sliceMs: 5});
        const bits = bitsFor(1e-6);
        const at = (x) => ({x: fromDecimal(x, bits), y: 0n, bits, pixelSize: 1e-6, radius: 1000});
        worker.onmessage({data: Object.assign({generation: 1}, at("0.2501"))});
        worker.onmessage({data: Object.assign({generation: 2}, at("-1.7548"))});
        for (let i = 0; i < 200 && replies.length === 0; i += 1) await pause(5);
        expect(replies.length).toBe(1);
        expect(replies[0].generation).toBe(2);
        expect(replies[0].period).toBe(3);
    });

    it("should start the view's orbit again from a nucleus it finds, worked out for one period", async function () {
        const events = createEvents();
        const localWorker = function () {
            const worker = {terminate: () => {}};
            const handler = createWorkerHandler((message) => worker.onmessage({data: message}));
            worker.postMessage = (message) => handler({data: structuredClone(message)});
            return worker;
        };
        const changes = [];
        events.listenTo(events.referenceChanged, (change) => changes.push(change));
        const orbit = createReferenceOrbit({events, newWorker: localWorker, needed: () => true, initialLength: 1000, searchRadius: 1000});
        events.fire(events.viewChanged, viewAt(seahorse[0], seahorse[1], 1e-20));
        for (let i = 0; i < 400 && !(orbit.period() && orbit.complete()); i += 1) await pause(5);
        expect(changes.length).toBe(1);
        expect(orbit.period()).toBeGreaterThan(1000);
        expect(orbit.complete()).toBe(true);
        expect(orbit.escaped()).toBe(false);
        expect(orbit.length()).toBe(orbit.period() + 1);
        // Where the nucleus is, in pixels from the centre.
        expect(Math.hypot(changes[0].offsetX, changes[0].offsetY)).toBeLessThan(1000);
        orbit.dispose();
    });
});

// The iteration at which |z|^2 first passes 16, as perturbation.spec.js works it out.
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
