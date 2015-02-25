namespace("jim.anim");
jim.anim.create = function (callback) {
    "use strict";
    var tick = function () {
        callback();
        window.requestAnimationFrame(tick);
    };
    return {
        start: function () {
            tick();
        }
    };
};
