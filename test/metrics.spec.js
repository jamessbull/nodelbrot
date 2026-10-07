import { createEvents } from "../src/client/events.js";
import { createMetrics } from "../src/client/metrics.js";

describe("Performance metrics", function () {
    it("should report frames per second, averaged over the last eight frames", function () {
        const events = createEvents();
        let now = 0;
        createMetrics({time: () => now}, events);
        const reported = [];
        events.listenTo(events.framesPerSecond, (fps) => reported.push(Number(fps)));

        // Frames 100ms apart, then two together, then ten more 50ms apart.
        [0, 100, 200, 300, 300].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => 300 + (50 * n))).forEach(function (t) {
            now = t;
            events.fire(events.frameComplete);
        });

        expect(reported[0]).toBe(0);
        expect(reported[1]).toBe(0);
        expect(reported[3]).toBe(10);
        expect(reported[4]).toBeCloseTo(13.33, 2);
        expect(reported[reported.length - 1]).toBe(20);
    });
});
