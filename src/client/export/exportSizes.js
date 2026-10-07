// The largest export, in pixels: A4 at 300 dots per inch. Browsers limit the size of the image they can
// make, some not much above this.
export const maxExportPixels = 6139 * 3508;

const scales = [1, 3, 6];

// The export sizes for a width x height display, the same shape as it: small (the display's size),
// medium and large (3 and 6 times as wide and high), and huge (as big as maxExportPixels allows). None
// is bigger than huge.
export function exportSizes(width, height) {
    const largest = Math.sqrt(maxExportPixels / (width * height));
    return scales.concat(largest).map((scale) => {
        const s = Math.min(scale, largest);
        return {width: Math.round(width * s), height: Math.round(height * s)};
    });
}

// The export size picker: options are the small, medium, large and huge choices in select. setDisplaySize
// updates the sizes for a new display size, and dimensions() is the chosen {width, height}.
export function createExportSizes(select, options, displayWidth, displayHeight) {
    const names = ["Small", "Medium", "Large", "Huge"];
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
