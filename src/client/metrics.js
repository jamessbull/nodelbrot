namespace("jim.metrics");
jim.metrics.create = function (_clock, _events) {
    "use strict";
    var times = new Uint32Array(3);
    var currentIndex = -1;
    function nextIndex(i) { return currentIndex > 1 ? 0 : i + 1; }
    function previousIndex(i) { return i < 1 ? 2 : i - 1; }
    function frameTime(i) { return times[i] - times[previousIndex(i)]; }
    function fps() {
        var frame1 = frameTime(currentIndex);
        var frame2 = frameTime(previousIndex(currentIndex));
        if (frame1 === 0 || frame2 === 0) return 0;
        var avgFrameTime = (frame1 + frame2) / 2;
        return 1000 / avgFrameTime;
    }

    _events.listenTo(_events.frameComplete, function () {
        currentIndex = nextIndex(currentIndex);
        times[currentIndex] = _clock.time();
        _events.fire(_events.currentFramesPerSecond, fps());
    });
};

namespace("jim.metrics.clock");
jim.metrics.clock.create = function () {
    "use strict";

    return {
        time: function () {
            return new Date().getTime();
        }
    };
};