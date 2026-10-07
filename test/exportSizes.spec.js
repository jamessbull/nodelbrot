import { exportSizes, maxExportPixels } from "../src/client/export/exportSizes.js";

describe("export sizes", function () {
    it("should be the display's size and 3 and 6 times it", function () {
        const sizes = exportSizes(700, 400);
        expect(sizes.slice(0, 3)).toEqual([{width: 700, height: 400}, {width: 2100, height: 1200}, {width: 4200, height: 2400}]);
    });

    it("should make the huge size as big as allowed, the display's shape", function () {
        const huge = exportSizes(700, 400)[3];
        expect(huge.width * huge.height).toBeLessThanOrEqual(maxExportPixels * 1.001);
        expect(huge.width * huge.height).toBeGreaterThan(maxExportPixels * 0.999);
        expect(huge.width / huge.height).toBeCloseTo(700 / 400, 2);
    });

    it("should not go past the huge size on a big display", function () {
        const sizes = exportSizes(2500, 1400);
        expect(sizes[2]).toEqual(sizes[3]);
        expect(sizes[1].width).toBeLessThanOrEqual(sizes[3].width);
    });
});
