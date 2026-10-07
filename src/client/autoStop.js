// Stops rendering once the image has stopped changing: when no more pixels have escaped for a while,
// and a fair share of them have. Zooming or moving starts it again.
export function createAutoStop(events, pixelCount) {
    const on = events.listenTo;
    // A tenth of the image must have escaped before rendering can stop on its own.
    const target = pixelCount / 10;
    let totalEscaped = 0;
    let totalAtLastFrame = 0;
    let framesWithoutEscapes = 0;

    function restart() {
        events.fire(events.restart);
        totalEscaped = 0;
        totalAtLastFrame = 0;
        framesWithoutEscapes = 0;
    }

    on(events.zoomToSelection, function () {
        restart();
    });

    on(events.zoomOut, function () {
        restart();
    });

    on(events.moveBy, function () {
        restart();
    });

    on(events.transformView, function () {
        restart();
    });

    on(events.escapedTotal, function (count) {
        totalEscaped = count;
    });

    // Stops rendering once no more pixels have escaped for 10 frames, if a fair amount of the image has.
    // This counts frames rather than worker replies, so it doesn't depend on how many workers there are.
    on(events.frameComplete, function () {
        framesWithoutEscapes = totalEscaped === totalAtLastFrame ? framesWithoutEscapes + 1 : 0;
        totalAtLastFrame = totalEscaped;
        if (framesWithoutEscapes > 10 && totalEscaped > target) {
            events.fire(events.stop);
            framesWithoutEscapes = 0;
        }
    });
}
