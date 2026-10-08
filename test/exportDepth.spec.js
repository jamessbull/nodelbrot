import { exportArea, maxDepth, maxGpuDepth, parseDepth, suggestedDepth } from "../src/client/export/exporter.js";
import { rectangle } from "../src/client/geometry.js";

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

    it("should suggest a little past the last escape on screen, rounded", function () {
        expect(suggestedDepth(6935)).toBe(7300);
        expect(suggestedDepth(788930)).toBe(830000);
        expect(suggestedDepth(120)).toBe(1000);
        expect(suggestedDepth(5000000)).toBe(maxDepth);
        expect(suggestedDepth(5000000, maxGpuDepth)).toBe(5300000);
    });

    it("should refuse depths out of range", function () {
        expect(parseDepth("0").error).toContain("between 1 and");
        expect(parseDepth(String(maxDepth + 1)).error).toContain("between 1 and");
        expect(parseDepth(String(maxDepth))).toEqual({depth: maxDepth});
        // The GPU goes deeper, as far as it counts iterations exactly.
        expect(parseDepth("10000000", maxGpuDepth)).toEqual({depth: 10000000});
        expect(parseDepth("30000000", maxGpuDepth)).toEqual({depth: 30000000});
        expect(parseDepth("200000000", maxGpuDepth)).toEqual({depth: 200000000});
        expect(parseDepth(String(maxGpuDepth + 1), maxGpuDepth).error).toContain("268,435,456");
    });
});

describe("export area", function () {
    it("should show all of the area on screen, with more above and below, or either side, for another shape", function () {
        const screen = rectangle(-2, -0.5, 3, 1);
        const paper = exportArea(screen, 9933, 7016);
        expect(paper.width()).toBe(3);
        expect(paper.height()).toBeCloseTo(3 * 7016 / 9933, 12);
        expect(paper.topLeft().x + (paper.width() / 2)).toBeCloseTo(-0.5, 12);
        expect(paper.topLeft().y + (paper.height() / 2)).toBeCloseTo(0, 12);
        const tall = exportArea(screen, 7016, 9933);
        expect(tall.height()).toBeCloseTo(3 * 9933 / 7016, 12);
        expect(tall.width()).toBe(3);
        const same = exportArea(screen, 3000, 1000);
        expect([same.width(), same.height()]).toEqual([3, 1]);
    });
});
