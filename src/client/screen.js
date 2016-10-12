jim.screen = {};
jim.screen.create = function (args, _stopwatch, _events) {
    "use strict";
    var n = 0,
        segmentsLen = Math.sqrt(args.segments.length),
        segX = args.segments[0].size(),
        segY = args.segments[0].sizeY(),
        go = true,
        wholeScreen = jim.image.create(segX * segmentsLen, segY * segmentsLen, function () {});
    var context = wholeScreen.canvas.getContext('2d');

    var stopwatch = _stopwatch ? _stopwatch : jim.stopwatch.create();
    var segmentCount = 0;

    return {
        draw: function () {
            stopwatch.start();
            segmentCount = 0;
            while (stopwatch.elapsed() < 30 && go) {
                if (n === (args.segments.length)) {
                    n = 0;
                }
                if (go) {
                    args.segments[n].draw(context);
                }
                stopwatch.stop();
                n += 1;
                segmentCount +=1;
            }
        },
        canvas: wholeScreen.canvas,
        context : context,
        stop: function () {
            _events.fire("stopConcHistogram");
            go = false;
        },
        go: function () {
            go = true;
        }
    };
};