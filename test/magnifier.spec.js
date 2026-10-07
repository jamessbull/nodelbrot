import { magnifiedArea } from "../src/client/pixelExaminer.js";

describe("the magnified area", function () {
    it("should be centred on the point", function () {
        expect(magnifiedArea(50, 40, 18, 700, 400)).toEqual({x: 41, y: 31});
    });

    it("should stay inside the image at its edges", function () {
        expect(magnifiedArea(2, 3, 18, 700, 400)).toEqual({x: 0, y: 0});
        expect(magnifiedArea(698, 399, 18, 700, 400)).toEqual({x: 682, y: 382});
    });
});
