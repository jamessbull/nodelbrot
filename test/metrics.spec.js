import { createEvents } from "../src/client/events.js";
import { createMetrics } from "../src/client/metrics.js";

describe("Performance metrics", function () {
    it("should report frames per second, averaged over the last two frames", function () {
        const events = createEvents();
        let now = 0;
        createMetrics({time: () => now}, events);
        const reported = [];
        events.listenTo(events.framesPerSecond, (fps) => reported.push(Number(fps)));

        // Frames 100ms apart, then 50ms.
        [0, 100, 200, 300, 350].forEach(function (t) {
            now = t;
            events.fire(events.frameComplete);
        });

        expect(reported[0]).toBe(0);
        expect(reported[3]).toBe(10);
        expect(reported[4]).toBeCloseTo(13.33, 2);
    });
});
