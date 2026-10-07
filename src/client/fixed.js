// Fixed-point numbers for coordinates too precise for doubles: a BigInt n stands for n / 2^bits, so it
// has bits binary places. Doubles have about 16 significant digits; these have as many as are asked for.

const two = 2n;

// The number of binary places needed to place points to a fraction of a pixel pixelSize wide, with room
// to spare: a multiple of 32, at least 64.
export function bitsFor(pixelSize) {
    const needed = 64 + Math.max(0, Math.ceil(-Math.log2(pixelSize)));
    return Math.ceil(needed / 32) * 32;
}

// n, which has fromBits binary places, with toBits instead, rounded to nearest.
export function rescale(n, fromBits, toBits) {
    if (toBits >= fromBits) {
        return n << BigInt(toBits - fromBits);
    }
    return roundShiftRight(n, fromBits - toBits);
}

function roundShiftRight(n, places) {
    if (places === 0) return n;
    const half = 1n << BigInt(places - 1);
    // >> rounds towards minus infinity, so adding a half rounds to nearest (halves up).
    return (n + half) >> BigInt(places);
}

// The double d as a fixed-point number with bits binary places, exactly or rounded to nearest.
export function fromNumber(d, bits) {
    if (!Number.isFinite(d)) {
        throw new RangeError("Can't make a fixed-point number from " + d);
    }
    if (d === 0) return 0n;
    // d is mantissa * 2^exponent, with mantissa a whole number of up to 53 bits.
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, d);
    const high = view.getUint32(0);
    const low = view.getUint32(4);
    const biasedExponent = (high >>> 20) & 0x7ff;
    let mantissa = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
    let exponent;
    if (biasedExponent === 0) {
        exponent = -1074;                       // subnormal
    } else {
        mantissa |= 1n << 52n;
        exponent = biasedExponent - 1075;
    }
    const shift = exponent + bits;
    const magnitude = shift >= 0 ? mantissa << BigInt(shift) : roundShiftRight(mantissa, -shift);
    return d < 0 ? -magnitude : magnitude;
}

function bitLength(n) {
    return n === 0n ? 0 : n.toString(2).length;
}

// The fixed-point number n, with bits binary places, as the nearest double (to within a rounding or
// two). Numbers too small for a double come out as 0.
export function toNumber(n, bits) {
    if (n === 0n) return 0;
    const negative = n < 0n;
    const magnitude = negative ? -n : n;
    // Keep the top 64 bits, which a double holds to its full precision, and scale by the rest.
    const drop = Math.max(0, bitLength(magnitude) - 64);
    const top = Number(magnitude >> BigInt(drop));
    let power = drop - bits;
    let result = top;
    // 2^power may be out of a double's range even when the result isn't, so scale in steps.
    while (power > 1000) { result *= 2 ** 1000; power -= 1000; }
    while (power < -1000) { result *= 2 ** -1000; power += 1000; }
    result *= 2 ** power;
    return negative ? -result : result;
}

// A decimal such as "-0.7436438870371587047521915" or "1.5e-30" as a fixed-point number with bits binary
// places, rounded to nearest.
export function fromDecimal(text, bits) {
    const match = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(String(text));
    if (!match || (match[2] === "" && (match[3] === undefined || match[3] === ""))) {
        throw new SyntaxError("Not a number: " + text);
    }
    const digits = BigInt((match[2] || "") + (match[3] || "") || "0");
    const exponent = Number(match[4] || 0) - (match[3] || "").length;
    let magnitude;
    if (exponent >= 0) {
        magnitude = (digits * 10n ** BigInt(exponent)) << BigInt(bits);
    } else {
        const divisor = 10n ** BigInt(-exponent);
        magnitude = ((digits << BigInt(bits)) * two + divisor) / (two * divisor);
    }
    return match[1] === "-" ? -magnitude : magnitude;
}

// The fixed-point number n, with bits binary places, as a decimal with at most fractionDigits digits
// after the point (rounded, with trailing zeros dropped).
export function toDecimal(n, bits, fractionDigits) {
    const negative = n < 0n;
    const magnitude = negative ? -n : n;
    const scale = 10n ** BigInt(fractionDigits);
    // The value times 10^fractionDigits, rounded to nearest.
    const scaled = ((magnitude * scale * two) + (1n << BigInt(bits))) >> BigInt(bits + 1);
    const whole = scaled / scale;
    const fraction = (scaled % scale).toString().padStart(fractionDigits, "0").replace(/0+$/, "");
    const text = whole.toString() + (fraction ? "." + fraction : "");
    return negative && scaled !== 0n ? "-" + text : text;
}

// How many decimal places tell points a fraction of a pixel pixelSize wide apart.
export function decimalPlacesFor(pixelSize) {
    return Math.max(1, Math.ceil(-Math.log10(pixelSize)) + 2);
}
