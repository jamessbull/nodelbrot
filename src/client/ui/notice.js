namespace("jim.ui.notice");

// Shows short messages across the top of a canvas (the one drawn over the image) for a few seconds.
jim.ui.notice.create = function (canvas) {
    "use strict";
    var context = canvas.getContext('2d');
    var clearTimer;
    return {
        show: function (message) {
            clearTimeout(clearTimer);
            context.clearRect(0, 0, canvas.width, 30);
            context.font = "14px courier";
            context.strokeStyle = "rgba(0,0,0,255)";
            context.fillStyle = "rgba(255,255,255,255)";
            context.lineWidth = 3;
            context.strokeText(message, 15, 20);
            context.fillText(message, 15, 20);
            clearTimer = setTimeout(function () {
                context.clearRect(0, 0, canvas.width, 30);
            }, 5000);
        }
    };
};
