jim.screen = {};
jim.screen.create = function (args) {
    "use strict";
    var n = 0,
        segmentsLen = Math.sqrt(args.segments.length),
        segX = args.segments[0].size(),
        segY = args.segments[0].sizeY(),
        wholeScreen = jim.image.create(segX * segmentsLen, segY * segmentsLen, function () {});

    return {
        draw: function () {
            var context;
            if (n === (args.segments.length)) {
                n = 0;
            }
            context = wholeScreen.canvas.getContext('2d');
            args.segments[n].draw(context);
            n += 1;
        },
        canvas: wholeScreen.canvas,
        context : wholeScreen.canvas.getContext('2d')
    };
};