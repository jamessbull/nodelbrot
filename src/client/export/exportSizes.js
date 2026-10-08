// A1 paper at 300 dots per inch, long side first.
export const a1 = {long: 9933, short: 7016};

// The largest export, in pixels: as many as A1 at 300 dots per inch. Exports are written without a
// canvas (see pngWriter.js), so it is memory (about 4 bytes a pixel while the image is made, more in
// browsers that hold the PNG in memory) and time that limit them.
export const maxExportPixels = a1.long * a1.short;

const scales = [1, 3, 6];

// The export sizes for a width x height display: small (the display's size), medium and large (3 and 6
// times as wide and high), and huge (as big as maxExportPixels allows), all the same shape as it, and
// A1 (see a1), turned the same way as the display. None is bigger than huge.
export function exportSizes(width, height) {
    const largest = Math.sqrt(maxExportPixels / (width * height));
    const screenShaped = scales.concat(largest).map((scale) => {
        const s = Math.min(scale, largest);
        return {width: Math.round(width * s), height: Math.round(height * s)};
    });
    const paper = width >= height ? {width: a1.long, height: a1.short} : {width: a1.short, height: a1.long};
    return screenShaped.concat(paper);
}

// The export size picker: options are the small, medium, large, huge and A1 choices in select. setDisplaySize
// updates the sizes for a new display size, and dimensions() is the chosen {width, height}.
export function createExportSizes(select, options, displayWidth, displayHeight) {
    const names = ["Small", "Medium", "Large", "Huge", "A1 print"];
    let sizes;

    function setDisplaySize(width, height) {
        sizes = exportSizes(width, height);
        options.forEach((option, i) => {
            option.textContent = names[i] + " (" + sizes[i].width + " × " + sizes[i].height + ")";
        });
    }

    setDisplaySize(displayWidth, displayHeight);
    return {
        setDisplaySize: setDisplaySize,
        dimensions: () => sizes[Math.max(0, select.selectedIndex)]
    };
}
