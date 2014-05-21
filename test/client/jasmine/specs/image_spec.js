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

    it("can draw a canvas to the screen at an offset", function () {
        var col = jim.colour.create,
            screen,
            image,
            black = col(0, 0, 0, 255),
            blue = col(0, 0, 255, 255),
            red = col(255, 0, 0, 255);

        spyOn(document, 'createElement').andCallThrough();
        spyOn(document.body, 'appendChild').andCallThrough();

        screen = jim.screen.create(document, 100, 200);
        expect(document.createElement).toHaveBeenCalledWith('canvas');

        screen.addToDocument();
        expect(document.body.appendChild).toHaveBeenCalled();

        screen.setColour(0, 99, black);
        checkColour(screen.at(0, 99), black);

        screen.setColour(0, 99, blue);
        checkColour(screen.at(0, 99), blue);

        image = jim.screen.create(document, 50, 50);
        image.fill(red);
        screen.drawImage(25, 25, image);
    });

});