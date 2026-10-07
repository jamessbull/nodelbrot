import { maxDepth, parseDepth } from "../src/client/export/exporter.js";

describe("reading the export depth", function () {

    it("should read whole numbers", function () {
        expect(parseDepth("1000")).toEqual({depth: 1000});
        expect(parseDepth(" 250000 ")).toEqual({depth: 250000});
    });

    it("should allow commas and spaces between digits", function () {
        expect(parseDepth("1,000,000")).toEqual({depth: 1000000});
        expect(parseDepth("10 000")).toEqual({depth: 10000});
    });

    it("should refuse anything that isn't a whole number", function () {
        ["", "abc", "1000x", "1.5", "-5", "1e6"].forEach(function (text) {
            expect(parseDepth(text).error).toContain("whole number");
        });
    });

    it("should refuse depths out of range", function () {
        expect(parseDepth("0").error).toContain("between 1 and");
        expect(parseDepth(String(maxDepth + 1)).error).toContain("between 1 and");
        expect(parseDepth(String(maxDepth))).toEqual({depth: maxDepth});
    });
});
