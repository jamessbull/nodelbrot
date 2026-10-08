import { binOf, binsFor } from "./histogramBins.js";

// Starting size of the escape histogram. It grows when deeper iterations are reached.
export const initialHistogramSize = 250000;

// The cumulative count of escapes by each iteration, or past exactBins, by the end of each bin of them
// (see histogramBins.js), built from the workers' updates.
export function createEscapeHistogram(events, histogram) {
    const on = events.listenTo;
    let currentTotal = 0;
    let lastTimeRound = 0;
    let filledLength = 0;       // entries at and beyond this index have not been written yet, so are zero
    let depth = 0;              // the iterations the entries written cover

    function ensureCapacity(size) {
        if (size > histogram.length) {
            const grown = new Uint32Array(Math.max(size, histogram.length * 2));
            grown.set(histogram);
            histogram = grown;
        }
    }

    function processHistogramUpdates(updateInfo) {
        const updates = updateInfo.update;
        const lastIterationCalculated = updateInfo.currentIteration;
        if (updates.length === 0) {
            return;
        }
        const end = lastIterationCalculated + updates.length;
        ensureCapacity(binsFor(end));
        // Escapes at iterations counted before (after re-referencing) add to the entries there; past
        // those, the entries are the total so far and these escapes.
        const adding = lastIterationCalculated <= lastTimeRound;
        let runningTotal = 0;
        let bin = -1;
        let initialValue = 0;
        for (let i = 0; i < updates.length; i += 1) {
            runningTotal += updates[i];
            const at = binOf(lastIterationCalculated + i);
            if (at !== bin) {
                bin = at;
                initialValue = adding ? histogram[at] : currentTotal;
            }
            histogram[at] = runningTotal + initialValue;
        }
        currentTotal += runningTotal;
        lastTimeRound = lastIterationCalculated;
        filledLength = Math.max(filledLength, binsFor(end - 1));
        depth = Math.max(depth, end);
        events.fire(events.escapedTotal, currentTotal);
    }

    // Listeners get the live histogram rather than a copy, so they must not modify it, and must copy
    // it if they need it to stay unchanged.
    on(events.escapesFromWorkers, function (updateInfo) {
        processHistogramUpdates(updateInfo);
        const info = {array: histogram, filledLength, depth, total: currentTotal, currentIteration: updateInfo.currentIteration};
        events.fire(events.histogramChanged, info);
    });

    // Rendering starts again for a new view. (A new reference orbit for the same view keeps the escapes
    // so far: see rereference.js.)
    on(events.viewChanged, function () {
        histogram = new Uint32Array(initialHistogramSize);
        currentTotal = 0;
        lastTimeRound = 0;
        filledLength = 0;
        depth = 0;
    });
    return {};
}
