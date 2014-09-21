describe("The image drawer", function () {
    "use strict";
    var checkColour = function (actual, expected) {
        expect(actual.red).toBe(expected.red);
        expect(actual.green).toBe(expected.green);
        expect(actual.blue).toBe(expected.blue);
        expect(actual.alpha).toBe(expected.alpha);
    };
    it("should return the dom image data object with the data supplied by the function", function () {
        var data,
            drawFunc = function (x, y) {
                console.log("draw called " + x + ", " + y);
                return jim.colour.create(2 * x, 2 * y, 0, 0);
            },
            image = jim.image.create(4, drawFunc);
        image.drawXY();
        data = image.canvas.getContext('2d').getImageData(0, 0, 4, 4).data;
        expect(data.length).toBe(64);
    });

});