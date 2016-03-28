namespace("jim.anim");
jim.anim.create = function (_callback) {
    "use strict";
    var callback = _callback;
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

