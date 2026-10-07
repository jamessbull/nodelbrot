import { bitsFor, decimalPlacesFor, fromDecimal, fromNumber, rescale, toDecimal, toNumber } from "../src/client/fixed.js";

describe("fixed-point numbers", function () {
    it("should hold doubles exactly", function () {
        [0, 1, -1, 0.1, -0.7436438870371587, 1e-300, -2.5e-310, 123456.789, 2 ** -60].forEach(function (d) {
            expect(toNumber(fromNumber(d, 1200), 1200)).toBe(d);
        });
    });

    it("should round doubles that need more places than it has", function () {
        expect(fromNumber(0.75, 1)).toBe(2n);      // 1.5, rounded up from 0.75 * 2
        expect(fromNumber(0.25, 1)).toBe(1n);
        expect(fromNumber(-0.25, 1)).toBe(-1n);    // halves round away from zero
    });

    it("should read and write decimals with more digits than a double holds", function () {
        const text = "-0.74364388703715870475219150611477";
        const n = fromDecimal(text, 200);
        expect(toDecimal(n, 200, 32)).toBe("-0.74364388703715870475219150611477");
        expect(toDecimal(fromDecimal("1.5e-30", 200), 200, 31)).toBe("0.0000000000000000000000000000015");
        expect(toDecimal(fromDecimal("12", 64), 64, 5)).toBe("12");
        expect(toNumber(fromDecimal("-2.5", 64), 64)).toBe(-2.5);
    });

    it("should tell apart points much closer than doubles can", function () {
        const bits = bitsFor(1e-200);
        const a = fromDecimal("-0.75", bits);
        const b = a + fromNumber(3e-200, bits);
        expect(toNumber(b - a, bits)).toBeCloseTo(3e-200, 205);
        expect(toNumber(a, bits)).toBe(-0.75);
    });

    it("should change the number of places, rounding", function () {
        expect(rescale(5n, 2, 4)).toBe(20n);
        expect(rescale(7n, 2, 1)).toBe(4n);         // 1.75 to the nearest half
        expect(rescale(-7n, 2, 1)).toBe(-3n);       // -1.75 to -1.5
    });

    it("should have enough places for the pixel size", function () {
        expect(bitsFor(0.005)).toBe(96);
        expect(bitsFor(1e-300)).toBeGreaterThanOrEqual(997 + 64);
        expect(decimalPlacesFor(1e-20)).toBe(22);
    });

    it("should refuse things that aren't numbers", function () {
        expect(() => fromDecimal("abc", 64)).toThrowError(SyntaxError);
        expect(() => fromNumber(NaN, 64)).toThrowError(RangeError);
    });
});
