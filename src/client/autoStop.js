// Stops rendering once the image has stopped changing: when no more pixels have escaped for 10 frames
// and since the depth at which the last did, as deep again (escapes come further and further apart
// deeper in, as where bulbs join, and the GPU renders many frames a second), and a fair share of them
// have escaped. Zooming or moving starts it again. Go ({byUser: true} with start) carries on regardless,
// to the deepest the renderer goes, until Stop, or the view next moves.
export function createAutoStop(events, pixelCount) {
    const on = events.listenTo;
    // A tenth of the image must have escaped before rendering can stop on its own.
    const target = pixelCount / 10;
    let totalEscaped = 0;
    let totalAtLastFrame = 0;
    let framesWithoutEscapes = 0;
    let depth = 0;
    let lastEscapeDepth = 0;
    let byUser = false;

    function reset() {
        totalEscaped = 0;
        totalAtLastFrame = 0;
        framesWithoutEscapes = 0;
        depth = 0;
        lastEscapeDepth = 0;
        byUser = false;
    }

    function restart() {
        reset();
        events.fire(events.restart);
    }

    [events.zoomToSelection, events.zoomOut, events.moveBy, events.transformView].forEach((event) => on(event, restart));
    // Rendering started again for a new view another way (a link, say).
    on(events.restart, reset);

    on(events.start, function (how) {
        if (how && how.byUser) {
            byUser = true;
        }
    });

    on(events.depthReached, function (reached) {
        depth = reached;
    });

    on(events.escapedTotal, function (count) {
        totalEscaped = count;
    });

    // The deepest iteration at which a pixel has escaped, from a frame's escape counts.
    on(events.escapesFromWorkers, function ({update, currentIteration}) {
        for (let i = update.length - 1; i >= 0; i -= 1) {
            if (update[i] > 0) {
                lastEscapeDepth = Math.max(lastEscapeDepth, currentIteration + i);
                return;
            }
        }
    });

    // Counts frames rather than worker replies, so it doesn't depend on how many workers there are.
    on(events.frameComplete, function () {
        framesWithoutEscapes = totalEscaped === totalAtLastFrame ? framesWithoutEscapes + 1 : 0;
        totalAtLastFrame = totalEscaped;
        if (!byUser && framesWithoutEscapes > 10 && depth >= 2 * lastEscapeDepth && totalEscaped > target) {
            events.fire(events.stop);
            framesWithoutEscapes = 0;
        }
    });
}
