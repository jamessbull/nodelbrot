describe("The palette", function () {
    "use strict";

    it("should return a colour for any number between 0 and 1", function () {
        var palette = jim.palette.create(),
            colours = [];

        colours.push(palette.colourAt(0));
        colours.push(palette.colourAt(0.5));
        colours.push(palette.colourAt(1));

        colours.forEach(function (colour) {
            expect(colour.hasOwnProperty('r')).toBe(true);
            expect(colour.hasOwnProperty('g')).toBe(true);
            expect(colour.hasOwnProperty('b')).toBe(true);
            expect(colour.hasOwnProperty('a')).toBe(true);
        });
    });

    it("should take a number between 0 and 1 and return a different colour even for values which are close", function () {
        var palette = jim.palette.create(),
            count,
            value = 0,
            colour1,
            colour2,
            allTheSame;

        for (count = 0; count < 100; count += 1) {
            var c = palette.colourAt(value);
            colour1 = {r: c.r,g: c.g,b: c.b, a: c.a};
            value += 0.01;
            colour2 = palette.colourAt(value);

            allTheSame = (colour1.r === colour2.r && colour1.g === colour2.g && colour1.b === colour2.b);
            expect(allTheSame).not.toBe(true);
        }

    });

    it("should not dupe any colour across node boundaries", function () {
        var palette = jim.palette.create(),
            value = 0,
            colour1,
            colour2,
            colour3;

        palette.setNodes([]);
        palette.addSpecificNode(35, 0.25);
        colour1 = palette.colourAt(0.2499);
        colour2 = palette.colourAt(0.25);
        colour3 = palette.colourAt(0.2501);

        console.log(colour1);
        console.log(colour2);
        console.log(colour3);

        var allTheSame = (colour3.r === colour2.r && colour3.g === colour2.g && colour3.b === colour2.b && colour1.r === colour2.r && colour1.g === colour2.g && colour1.b === colour2.b);
        expect(allTheSame).not.toBe(true);


    });
});