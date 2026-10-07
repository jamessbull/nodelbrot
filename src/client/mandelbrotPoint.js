const histogramEscapeValue = 16;
const imageEscapeValue = 9007199254740991;

// Points inside the main cardioid or the period-2 bulb never escape, so they don't need iterating.
export function inMainCardioidOrBulb(mx, my) {
    const xMinusQuarter = mx - 0.25;
    const ySquared = my * my;
    const q = (xMinusQuarter * xMinusQuarter) + ySquared;
    const xPlusOne = mx + 1;
    return q * (q + xMinusQuarter) <= 0.25 * ySquared || (xPlusOne * xPlusOne) + ySquared <= 0.0625;
}

// Iterates one point from scratch or from where an earlier call left it, one iteration at a time. The
// renderer uses pixelIterator, which does the same for many points at once; this is the reference it
// is checked against.
export function calculatePoint(mx, my, noOfIterations, startIteration, startX, startY, startHistogramEscapedAt) {
    let x = startX;
    let y = startY;
    let timesToRun = noOfIterations;
    let iterations = 0;
    let imageEscapedAt = 0;
    let histogramEscapedAt = startHistogramEscapedAt;
    const alreadyEscaped = startHistogramEscapedAt !== 0;

    while (timesToRun > 0 && imageEscapedAt === 0) {
        const xSquared = x * x;
        const ySquared = y * y;
        const xSquaredPlusYSquared = xSquared + ySquared;

        iterations++;
        if (xSquaredPlusYSquared < imageEscapeValue) {
            y = ((x * y) * 2) + my;
            x = xSquared - ySquared + mx;
        }

        timesToRun -= 1;

        if (histogramEscapedAt === 0 && xSquaredPlusYSquared > histogramEscapeValue) {
            histogramEscapedAt = iterations;
        }

        if (imageEscapedAt === 0 && xSquaredPlusYSquared > imageEscapeValue) {
            imageEscapedAt = iterations;
        }
    }
    let finalHistogramEscapeValue;
    if (alreadyEscaped) {
        finalHistogramEscapeValue = startHistogramEscapedAt;
    } else {
        finalHistogramEscapeValue = histogramEscapedAt === 0 ? 0 : startIteration + histogramEscapedAt;
    }
    const finalImageEscapeValue = imageEscapedAt === 0 ? 0 : startIteration + imageEscapedAt;
    return {
        mx: mx, my: my, x: x, y: y, iterations: startIteration + iterations,
        histogramEscapedAt: finalHistogramEscapeValue, imageEscapedAt: finalImageEscapeValue
    };
}
