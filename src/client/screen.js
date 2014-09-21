jim.screen = {};
jim.screen.create = function (args) {
    "use strict";
    var n = 0,
        wholeScreen = jim.image.create(args.segments[0].size() * args.segments.length, function () {});
    document.body.appendChild(wholeScreen.canvas);

    return {
        draw: function () {
            var context;
            if (n === args.segments.length) {
                n = 0;
            }
            context = wholeScreen.canvas.getContext('2d');
            args.segments[n].draw(context);
            n += 1;
        }
    };
};