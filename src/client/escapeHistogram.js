// Starting size of the escape histogram. It grows when deeper iterations are reached.
export const initialHistogramSize = 250000;

// The cumulative count of escapes at each iteration, built from the workers' updates.
export function createEscapeHistogram(_events, _histoData) {
    const on = _events.listenTo;
    let currentTotal = 0;
    let lastTimeRound = 0;
    let filledLength = 0;       // entries at and beyond this index have not been written yet, so are zero

    function ensureCapacity(size) {
        if (size > _histoData.length) {
            const grown = new Uint32Array(Math.max(size, _histoData.length * 2));
            grown.set(_histoData);
            _histoData = grown;
        }
    }

    function processHistogramUpdates(updateInfo) {
        const updates = updateInfo.update;
        const lastIterationCalculated = updateInfo.currentIteration;
        ensureCapacity(lastIterationCalculated + updates.length);
        let runningTotal = 0;
        for (let i = 0; i < updates.length; i += 1) {
            runningTotal += updates[i];
            const initialValue = lastIterationCalculated > lastTimeRound ? currentTotal : _histoData[lastIterationCalculated + i];
            _histoData[lastIterationCalculated + i] = runningTotal + initialValue;
        }
        currentTotal += runningTotal;
        lastTimeRound = lastIterationCalculated;
        filledLength = Math.max(filledLength, lastIterationCalculated + updates.length);
        _events.fire(_events.escapedTotal, currentTotal);
    }

    // Listeners get the live histogram rather than a copy, so they must not modify it, and must copy
    // it if they need it to stay unchanged.
    on(_events.escapesFromWorkers, function (updateInfo) {
        processHistogramUpdates(updateInfo);
        const histoData = {array: _histoData, filledLength: filledLength, total: currentTotal, currentIteration: updateInfo.currentIteration};
        _events.fire(_events.histogramChanged, histoData);
    });

    on(_events.viewChanged, function () {
        _histoData = new Uint32Array(initialHistogramSize);
        currentTotal = 0;
        lastTimeRound = 0;
        filledLength = 0;
    });
    return {};
}
