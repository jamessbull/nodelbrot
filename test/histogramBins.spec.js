import { createEvents } from "../src/client/events.js";
import { createEscapeHistogram } from "../src/client/escapeHistogram.js";
import { binOf, binPosition, binsFor, binWidth, exactBins } from "../src/client/histogramBins.js";

describe("escape histogram bins", function () {
    it("should be one per iteration up to exactBins, and binWidth iterations each past there", function () {
        expect(binOf(0)).toBe(0);
        expect(binOf(exactBins - 1)).toBe(exactBins - 1);
        expect(binOf(exactBins)).toBe(exactBins);
        expect(binOf(exactBins + binWidth - 1)).toBe(exactBins);
        expect(binOf(exactBins + binWidth)).toBe(exactBins + 1);
        expect(binsFor(2 ** 28)).toBeLessThan(2048 * 16384);
    });

    it("should place smoothed iterations in their bins, in order", function () {
        expect(binPosition(100.25)).toBe(100.25);
        expect(Math.floor(binPosition(exactBins + (3 * binWidth) + 5.5))).toBe(exactBins + 3);
        let last = 0;
        for (let iteration = exactBins - 40; iteration < exactBins + 40; iteration += 0.5) {
            expect(binPosition(iteration)).toBeGreaterThan(last);
            last = binPosition(iteration);
        }
    });

    describe("histogram", function () {
        function histogram() {
            const events = createEvents();
            createEscapeHistogram(events, new Uint32Array(10));
            let info = null;
            events.listenTo(events.histogramChanged, (changed) => { info = changed; });
            events.fire(events.viewChanged, {});
            return {
                update: function (currentIteration, counts) {
                    events.fire(events.escapesFromWorkers, {currentIteration, update: Uint32Array.from(counts)});
                    return info;
                }
            };
        }

        it("should count escapes by iteration, then by bin, cumulatively", function () {
            const h = histogram();
            h.update(0, [1, 2]);
            // Frames either side of exactBins, the second ending partway through a bin.
            h.update(exactBins - 2, [1, 1, 1, 1]);
            const info = h.update(exactBins + 2, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1]);
            expect(info.array[1]).toBe(3);
            expect(info.array[exactBins - 1]).toBe(5);
            // Bin exactBins holds iterations exactBins to exactBins + 15: two escapes in the first frame,
            // and five at exactBins + 15 in the second.
            expect(info.array[exactBins]).toBe(12);
            expect(info.array[exactBins + 1]).toBe(13);
            expect(info.filledLength).toBe(exactBins + 2);
            expect(info.depth).toBe(exactBins + 17);
            expect(info.total).toBe(13);
        });

        it("should add escapes at iterations counted before, as after re-referencing", function () {
            const h = histogram();
            h.update(exactBins, [1, 1, 1, 1]);
            h.update(exactBins + 4, [1]);
            const info = h.update(exactBins, [2, 0, 0, 0]);
            expect(info.array[exactBins]).toBe(7);
            expect(info.total).toBe(7);
        });
    });
});
