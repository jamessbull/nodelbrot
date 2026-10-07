import { createEvents } from "../src/client/events.js";
import { rectangle } from "../src/client/geometry.js";
import { createPalette } from "../src/client/palette.js";
import { createInteractiveRenderer } from "../src/client/interactiveRenderer.js";

describe("the interactive renderer", function () {
    // Workers that note the jobs they are sent and never reply.
    function quietWorkers(posted) {
        return () => ({postMessage: (job) => posted.push(job), terminate: () => {}});
    }

    function renderer(events, posted) {
        const pixels = 20 * 10;
        return createInteractiveRenderer({
            width: 20, height: 10, events: events, workers: 2, newWorker: quietWorkers(posted),
            imgData: new Uint8ClampedArray(pixels * 4), escapeValues: new Uint32Array(pixels),
            xState: new Float64Array(pixels), yState: new Float64Array(pixels), imageEscapeValues: new Uint32Array(pixels)
        });
    }

    it("should send a changed palette even if the view changes before it goes", function () {
        const events = createEvents();
        const posted = [];
        const render = renderer(events, posted);
        events.fire(events.paletteChanged, createPalette());
        events.fire(events.extentsUpdate, rectangle(-2, -1, 3, 2));
        render.start();
        expect(posted.length).toBe(2);
        expect(posted.every((job) => job.paletteNodes)).toBe(true);
    });
});
