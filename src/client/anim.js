var anim = {};
anim.create = function (callback) {
    "use strict";
    var tick = function (timestamp) {
        callback();
        window.requestAnimationFrame(tick);
    };
    return {
        start: function () {
            window.requestAnimationFrame(tick);
        }
    };
};

