import { createPalette } from "../src/client/palette.js";

describe("The palette", function () {

    it("should return a colour for any number between 0 and 1", function () {
        const palette = createPalette(),
            colours = [];

        colours.push(palette.colourAt(0));
        colours.push(palette.colourAt(0.5));
        colours.push(palette.colourAt(1));

        colours.forEach(function (colour) {
            expect(Object.hasOwn(colour, 'r')).toBe(true);
            expect(Object.hasOwn(colour, 'g')).toBe(true);
            expect(Object.hasOwn(colour, 'b')).toBe(true);
            expect(Object.hasOwn(colour, 'a')).toBe(true);
        });
    });
    it("should take a number between 0 and 1 and return a different colour even for values which are close", function () {
        const palette = createPalette();
        let value = 0;
        for (let count = 0; count < 100; count += 1) {
            const c = palette.colourAt(value);
            const colour1 = {r: c.r, g: c.g, b: c.b};
            value += 0.01;
            const colour2 = palette.colourAt(value);
            expect(colour1.r === colour2.r && colour1.g === colour2.g && colour1.b === colour2.b).not.toBe(true);
        }
    });

    it("should not dupe any colour across node boundaries", function () {
        const palette = createPalette();
        palette.setNodes([]);
        palette.addSpecificNode(35, 0.25);
        const colourAt = function (position) {
            const c = palette.colourAt(position);
            return {r: c.r, g: c.g, b: c.b};
        };
        const colour1 = colourAt(0.2499);
        const colour2 = colourAt(0.25);
        const colour3 = colourAt(0.2501);

        expect(colour1).not.toEqual(colour2);
        expect(colour3).not.toEqual(colour2);
    });
});
