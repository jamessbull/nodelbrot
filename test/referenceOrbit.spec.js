import { createEvents } from "../src/client/events.js";
import { fromDecimal, fromNumber } from "../src/client/fixed.js";
import { viewAt } from "../src/client/view.js";
import { createOrbitCalculator, createReferenceOrbitWorker } from "../src/client/worker/referenceOrbit.js";
import { createReferenceOrbit } from "../src/client/referenceOrbit.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("reference orbits", function () {
    function calculator(x, y, bits) {
        return createOrbitCalculator(fromDecimal(x, bits), fromDecimal(y, bits), bits);
    }

    it("should match iterating in doubles while doubles are precise enough", function () {
        const values = calculator("-0.75", "0.1", 128).next(30);
        let x = 0, y = 0;
        for (let n = 0; n < 30; n += 1) {
            expect(values[2 * n]).toBeCloseTo(x, 10);
            expect(values[(2 * n) + 1]).toBeCloseTo(y, 10);
            [x, y] = [(x * x) - (y * y) - 0.75, (2 * x * y) + 0.1];
        }
    });

    it("should end with the value that escapes", function () {
        // c = 1: 0, 1, 2, 5, and 5 is past 2.
        const orbit = calculator("1", "0", 64);
        expect(Array.from(orbit.next(10))).toEqual([0, 0, 1, 0, 2, 0, 5, 0]);
        expect(orbit.escaped()).toBe(true);
        expect(orbit.length()).toBe(4);
        expect(orbit.next(10).length).toBe(0);
    });

    it("should go on for points in the set", function () {
        const orbit = calculator("-0.1", "0.1", 64);
        expect(orbit.next(500).length).toBe(1000);
        expect(orbit.escaped()).toBe(false);
    });

    it("should tell apart points closer than doubles can", function () {
        const bits = 256;
        const x = fromDecimal("-0.743643887037158704752191506114774", bits);
        const y = fromDecimal("0.131825904205311970493132056385139", bits);
        const a = createOrbitCalculator(x, y, bits).next(2000);
        const b = createOrbitCalculator(x + fromNumber(1e-30, bits), y, bits).next(2000);
        // The same to a double to start with, then the tiny difference grows until it shows.
        expect(a[2]).toBe(b[2]);
        let differ = false;
        for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
            differ = differ || a[i] !== b[i];
        }
        expect(differ).toBe(true);
    });

    it("should come out the same with more places than needed", function () {
        const at = (bits) => createOrbitCalculator(fromDecimal("-0.743643887037158704752191506114774", bits),
            fromDecimal("0.131825904205311970493132056385139", bits), bits).next(1000);
        const enough = at(192);
        const more = at(384);
        for (let i = 0; i < enough.length; i += 1) {
            expect(enough[i]).toBeCloseTo(more[i], 12);
        }
    });

    describe("worker", function () {
        function startWorker() {
            const replies = [];
            const worker = createReferenceOrbitWorker((message) => replies.push(message.referenceOrbit), {sliceMs: 5});
            return {replies, send: (data) => worker.onmessage({data})};
        }

        async function until(test) {
            for (let i = 0; i < 200 && !test(); i += 1) {
                await pause(5);
            }
        }

        it("should send the orbit in slices, as far as asked", async function () {
            const bits = 128;
            const start = {x: fromDecimal("-0.1", bits), y: fromDecimal("0.1", bits), bits};
            const worker = startWorker();
            worker.send({generation: 1, start, length: 3000});
            const received = () => worker.replies.reduce((total, r) => total + (r.values.length / 2), 0);
            await until(() => received() >= 3000);
            expect(received()).toBe(3000);
            const all = new Float64Array(6000);
            worker.replies.forEach((r) => all.set(r.values, 2 * r.from));
            expect(Array.from(all)).toEqual(Array.from(createOrbitCalculator(start.x, start.y, bits).next(3000)));

            worker.send({generation: 1, length: 4000});
            await until(() => received() >= 4000);
            expect(received()).toBe(4000);
        });

        it("should drop an old orbit for a new one", async function () {
            const bits = 128;
            const worker = startWorker();
            worker.send({generation: 1, start: {x: fromDecimal("-0.75", bits), y: 0n, bits}, length: 100000});
            worker.send({generation: 2, start: {x: fromDecimal("1", bits), y: 0n, bits}, length: 1000});
            worker.send({generation: 1, length: 200000});
            await until(() => worker.replies.some((r) => r.generation === 2 && r.escaped));
            expect(worker.replies.every((r) => r.generation === 2)).toBe(true);
            expect(worker.replies[worker.replies.length - 1].values.length).toBe(8);
        });
    });

    describe("for the view", function () {
        // A worker in this process, replying as a real one would.
        function localWorker() {
            const worker = {terminate: () => {}};
            const handler = createReferenceOrbitWorker((message) => worker.onmessage({data: message}), {sliceMs: 5});
            worker.postMessage = (message) => handler.onmessage({data: structuredClone(message)});
            return worker;
        }

        it("should work the orbit out ahead of the depth reached", async function () {
            const events = createEvents();
            const orbit = createReferenceOrbit({events, newWorker: localWorker, needed: () => true, initialLength: 1000});
            events.fire(events.viewChanged, viewAt("-0.1", "0.1", 1e-20));
            for (let i = 0; i < 200 && orbit.length() < 1000; i += 1) await pause(5);
            expect(orbit.length()).toBe(1000);
            events.fire(events.depthReached, 1500);
            for (let i = 0; i < 200 && orbit.length() < 3000; i += 1) await pause(5);
            expect(orbit.length()).toBe(3000);
            expect(orbit.values().length).toBe(6000);
        });

        it("should work more out when asked", async function () {
            const events = createEvents();
            const orbit = createReferenceOrbit({events, newWorker: localWorker, needed: () => true, initialLength: 1000});
            events.fire(events.viewChanged, viewAt("-0.1", "0.1", 1e-20));
            orbit.want(1500);
            for (let i = 0; i < 200 && orbit.length() < 2000; i += 1) await pause(5);
            expect(orbit.length()).toBe(2000);
        });

        it("should only work one out where it's needed, and keep it for the same view", async function () {
            const events = createEvents();
            let made = 0;
            const orbit = createReferenceOrbit({events, newWorker: () => { made += 1; return localWorker(); },
                needed: (view) => view.pixelSize < 1e-14, initialLength: 100});
            events.fire(events.viewChanged, viewAt("-0.75", "0", 0.01));
            expect(orbit.active()).toBe(false);
            const deep = viewAt("-0.1", "0.1", 1e-20);
            events.fire(events.viewChanged, deep);
            for (let i = 0; i < 200 && orbit.length() < 100; i += 1) await pause(5);
            events.fire(events.viewChanged, deep);
            expect(orbit.length()).toBe(100);
            expect(made).toBe(1);
        });
    });
});
