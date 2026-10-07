import { fractionAcross, hsvOf } from "../src/client/paletteEditor.js";

describe("the palette editor", function () {
    it("should read colours from links in any form the palette accepts", function () {
        expect(hsvOf({hsv: {h: 120, s: 0.5, v: 1}})).toEqual({h: 120, s: 0.5, v: 1});
        expect(hsvOf({hsv: {h: "46.1", s: "88.9%", v: "100%"}})).toEqual({h: 46.1, s: 0.889, v: 1});
    });

    it("should say where a pointer is across an element, kept inside it", function () {
        const element = {getBoundingClientRect: () => ({left: 100, top: 50, width: 200, height: 20})};
        expect(fractionAcross(element, {clientX: 150, clientY: 55})).toEqual({x: 0.25, y: 0.25});
        expect(fractionAcross(element, {clientX: 400, clientY: 0})).toEqual({x: 1, y: 0});
    });
});
