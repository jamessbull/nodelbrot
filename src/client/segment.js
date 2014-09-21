jim.segment = {};
jim.segment.create = function (size, xOffset, yOffset, f) {
    "use strict";
    var img = jim.image.create(size, f);

    return {
        draw: function (context) {
            img.drawXYOffset(xOffset, yOffset);
            context.drawImage(img.canvas, xOffset, yOffset);
        },
        size: function () {
            return size;
        }
    };
};