import { createPalette } from "../src/client/palette.js";

describe("palette blending", function () {

    // Red at 0.25 and blue at 0.75, between the palette's own black at 0 and white at 1.
    function redToBlue(blend) {
        const palette = createPalette();
        palette.fromNodeList([
            {position: 0.25, colourDesc: {h: 0, s: 1, v: 1}},
            {position: 0.75, colourDesc: {h: 240, s: 1, v: 1}}
        ]);
        palette.setBlend(blend);
        return palette;
    }

    function rounded(colour) {
        return {r: Math.round(colour.r), g: Math.round(colour.g), b: Math.round(colour.b)};
    }

    it("should blend in rgb by default", function () {
        const palette = createPalette();
        expect(palette.blend()).toBe("rgb");
    });

    it("should treat anything other than hsv as rgb", function () {
        const palette = createPalette();
        palette.setBlend("hsv");
        palette.setBlend(undefined);
        expect(palette.blend()).toBe("rgb");
    });

    it("should blend red and blue to purple in rgb", function () {
        expect(rounded(redToBlue("rgb").colourAt(0.5))).toEqual({r: 128, g: 0, b: 128});
    });

    it("should blend red and blue the short way round the colour wheel in hsv", function () {
        // Hue 0 to 240 is shorter going down through 300 (magenta) than up through 120 (green).
        expect(rounded(redToBlue("hsv").colourAt(0.5))).toEqual({r: 255, g: 0, b: 255});
        expect(rounded(redToBlue("hsv").colourAt(0.375))).toEqual({r: 255, g: 0, b: 128});
    });

    it("should give the nodes' own colours at the nodes in both blends", function () {
        ["rgb", "hsv"].forEach(function (blend) {
            expect(rounded(redToBlue(blend).colourAt(0.25))).toEqual({r: 255, g: 0, b: 0});
            expect(rounded(redToBlue(blend).colourAt(0.75))).toEqual({r: 0, g: 0, b: 255});
        });
    });

    it("should keep the hue of a colour when blending it with black in hsv", function () {
        // Between black at 0 and red at 0.25 there should only be darker reds.
        const colour = rounded(redToBlue("hsv").colourAt(0.125));
        expect(colour).toEqual({r: 128, g: 0, b: 0});
    });

    it("should build its lookup table with the selected blend", function () {
        const rgbTable = redToBlue("rgb").toLookupTable(5);
        const hsvTable = redToBlue("hsv").toLookupTable(5);
        const rgbMiddle = new Uint8ClampedArray(rgbTable.buffer).slice(8, 12);
        const hsvMiddle = new Uint8ClampedArray(hsvTable.buffer).slice(8, 12);
        expect(Array.from(rgbMiddle)).toEqual([128, 0, 128, 255]);
        expect(Array.from(hsvMiddle)).toEqual([255, 0, 255, 255]);
    });
});
