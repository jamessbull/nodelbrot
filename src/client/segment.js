jim.segment = {};
jim.segment.create = function (size, sizeY, xOffset, yOffset, f) {
    "use strict";
    var img = jim.image.create(size, sizeY, f);

    return {
        draw: function (context) {
            img.drawXYOffset(xOffset, yOffset);
            context.drawImage(img.canvas, xOffset, yOffset);
        },
        size: function () {
            return size;
        },
        sizeY: function () {
            return sizeY;
        },
        xOffset: function () {
            return xOffset;
        },
        yOffset: function () {
            return yOffset;
        }
    };
};
jim.segment.createSegments = function (sizeX, sizeY, rows, f) {
    "use strict";
    var x = 0, y = 0, segments = [],
        chunk = sizeX / rows,
        chunkY = sizeY / rows;
    for (y; y < rows; y += 1) {
        for (x; x < rows; x += 1) {
            segments.push(jim.segment.create(chunk, chunkY, x * chunk, y * chunkY, f));
        }
        x = 0;
    }
    return segments;
};