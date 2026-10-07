namespace("jim.mandelbrot.precision");

// Coordinates are doubles, which hold about 16 significant digits. Measured in the browser, the image
// turns blocky once neighbouring pixels are less than one step of that precision apart (1e-16 of the
// coordinates' size). This warns at about 5 steps, a few zooms before that.
jim.mandelbrot.precision.limit = 1e-15;

// Whether a view (a rectangle in the complex plane) shown pixelsAcross wide is near that limit.
jim.mandelbrot.precision.isNearLimit = function (extents, pixelsAcross) {
    "use strict";
    var x = extents.topLeft().x, y = extents.topLeft().y;
    var magnitude = Math.max(Math.abs(x), Math.abs(x + extents.width()), Math.abs(y), Math.abs(y + extents.height()), 1e-300);
    var pixelSize = extents.width() / (pixelsAcross - 1);
    return pixelSize / magnitude < jim.mandelbrot.precision.limit;
};

// Says so, once, each time the view goes past the limit.
jim.mandelbrot.precision.warning = function (events, notice, pixelsAcross) {
    "use strict";
    var nearLimit = false;
    events.listenTo(events.extentsUpdate, function (extents) {
        var wasNearLimit = nearLimit;
        nearLimit = jim.mandelbrot.precision.isNearLimit(extents, pixelsAcross);
        if (nearLimit && !wasNearLimit) {
            notice.show("This is about as far in as the numbers can go: deeper will look blocky.");
        }
    });
};
