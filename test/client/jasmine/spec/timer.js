var timer = {};
timer.create = function () {
    "use strict";
    var start = 0,
        stop = 0;
    return {
        start: function () {
            start = Date.now();
        },
        stop: function () {
            stop = Date.now();
        },
        elapsed: function (message) {
            var time = stop - start;
            console.log("" + message + " " +time);
            return  time;
        }
    };
}
