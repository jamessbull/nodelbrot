export function interpolate(from, to, fraction) {
    return from + ((to - from) * fraction);
}

export function round(number, decimalPlaces) {
    const multiplier = 10 ** decimalPlaces;
    return Math.round(number * multiplier) / multiplier;
}
