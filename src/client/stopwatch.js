export function createStopwatch() {
    let start = 0;
    let stop = 0;
    const marks = {};
    return {
        start: function () {
            start = Date.now();
        },
        stop: function () {
            stop = Date.now();
        },
        elapsed: function () {
            return stop - start;
        },
        mark: function (mark) {
            marks[mark] = Date.now();
        },
        timeSinceMark: function (mark) {
            return Date.now() - marks[mark];
        }
    };
}
