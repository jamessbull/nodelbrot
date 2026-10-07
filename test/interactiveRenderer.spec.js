import { createEvents } from "../src/client/events.js";
import { viewAt } from "../src/client/view.js";
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
        events.fire(events.viewChanged, viewAt(-0.5, 0, 0.15));
        render.start();
        expect(posted.length).toBe(2);
        expect(posted.every((job) => job.paletteNodes)).toBe(true);
    });

    // Workers that hold the jobs they are sent until replyAll(), then reply as real ones would.
    function heldWorkers() {
        const workers = [];
        return {
            newWorker: function () {
                const worker = {held: [], terminate: () => {}};
                worker.postMessage = (job) => worker.held.push(job);
                workers.push(worker);
                return worker;
            },
            sent: () => workers.reduce((total, w) => total + w.sentCount, 0),
            replyAll: function () {
                workers.forEach(function (worker) {
                    const jobs = worker.held;
                    worker.held = [];
                    jobs.forEach(function (job) {
                        const pixels = job.exportWidth * job.exportHeight;
                        worker.onmessage({data: {
                            batchid: job.batchid, firstRow: job.firstRow, rowStride: job.rowStride,
                            histogramUpdate: new Uint32Array(job.iterations).buffer,
                            imageDataBuffer: new Uint8ClampedArray(pixels * 4).buffer,
                            escapeValues: new Uint32Array(pixels).buffer,
                            extraDataSent: false
                        }});
                    });
                });
            },
            waiting: () => workers.reduce((total, w) => total + w.held.length, 0)
        };
    }

    function startedRenderer(events, workers) {
        const pixels = 20 * 10;
        const render = createInteractiveRenderer({
            width: 20, height: 10, events: events, workers: 2, newWorker: workers.newWorker,
            imgData: new Uint8ClampedArray(pixels * 4), escapeValues: new Uint32Array(pixels),
            xState: new Float64Array(pixels), yState: new Float64Array(pixels), imageEscapeValues: new Uint32Array(pixels)
        });
        events.fire(events.paletteChanged, createPalette());
        events.fire(events.viewChanged, viewAt(-0.5, 0, 0.15));
        render.start();
        return render;
    }

    it("should stay stopped after restarts while a frame was being rendered", function () {
        const events = createEvents();
        const workers = heldWorkers();
        startedRenderer(events, workers);
        events.fire(events.stop);
        events.fire(events.restart);
        events.fire(events.restart);
        events.fire(events.stop);
        workers.replyAll();
        expect(workers.waiting()).toBe(0);
    });

    it("should carry on after a restart while a frame was being rendered", function () {
        const events = createEvents();
        const workers = heldWorkers();
        startedRenderer(events, workers);
        events.fire(events.stop);
        events.fire(events.restart);
        workers.replyAll();
        expect(workers.waiting()).toBe(2);
    });

    it("should only have one frame out with the workers at a time", function () {
        const events = createEvents();
        const workers = heldWorkers();
        startedRenderer(events, workers);
        events.fire(events.stop);
        events.fire(events.showChanges);
        events.fire(events.showChanges);
        expect(workers.waiting()).toBe(2);
        workers.replyAll();
        expect(workers.waiting()).toBe(2);
        workers.replyAll();
        expect(workers.waiting()).toBe(0);
    });

    it("should only say the examine data is ready after a frame that fetched it", function () {
        const events = createEvents();
        const workers = heldWorkers();
        let published = 0;
        events.listenTo(events.pixelDataReady, () => { published += 1; });
        startedRenderer(events, workers);
        events.fire(events.stop);
        events.fire(events.startExamining);
        workers.replyAll();
        expect(published).toBe(0);
        workers.replyAll();
        expect(published).toBe(1);
    });
});
