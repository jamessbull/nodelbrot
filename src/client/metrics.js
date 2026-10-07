// Fires framesPerSecond after each frame, averaged over the last few frames (the GPU renderer can
// finish two at once).
export function createMetrics(clock, events) {
    const framesAveraged = 8;
    const times = [];

    events.listenTo(events.frameComplete, function () {
        times.push(clock.time());
        if (times.length > framesAveraged + 1) {
            times.shift();
        }
        const elapsed = times[times.length - 1] - times[0];
        const fps = times.length < 3 || elapsed === 0 ? 0 : (1000 * (times.length - 1) / elapsed);
        events.fire(events.framesPerSecond, fps.toFixed(2));
    });
}

export const systemClock = {
    time: () => Date.now()
};

export function showFps(displayElement, events) {
    events.listenTo(events.framesPerSecond, function (fps) {
        displayElement.innerHTML = fps;
    });
}