namespace("jim.stopwatch");
jim.stopwatch.create = function () {
    "use strict";
    var start = 0,
        stop = 0,
        marks = {};
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
        }, timeFunction : function (f) {
            this.start();
            f();
            this.stop();
            return this.elapsed();
        }
    };
};