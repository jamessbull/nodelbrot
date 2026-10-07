// Fires currentFramesPerSecond after each frame, averaged over the last two frames.
export function createMetrics(_clock, _events) {
    const times = new Uint32Array(3);
    let currentIndex = -1;
    function nextIndex(i) { return currentIndex > 1 ? 0 : i + 1; }
    function previousIndex(i) { return i < 1 ? 2 : i - 1; }
    function frameTime(i) { return times[i] - times[previousIndex(i)]; }

    function fps() {
        const frame1 = frameTime(currentIndex);
        const frame2 = frameTime(previousIndex(currentIndex));
        if (frame1 === 0 || frame2 === 0) return 0;
        const avgFrameTime = (frame1 + frame2) / 2;
        return (1000 / avgFrameTime).toFixed(2);
    }

    _events.listenTo(_events.frameComplete, function () {
        currentIndex = nextIndex(currentIndex);
        times[currentIndex] = _clock.time();
        _events.fire(_events.framesPerSecond, fps());
    });
}

export const systemClock = {
    time: () => Date.now()
};

export function showFps(_displayElement, _events) {
    _events.listenTo(_events.framesPerSecond, function (fps) {
        _displayElement.innerHTML = fps;
    });
}