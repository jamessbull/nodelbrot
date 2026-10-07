import { canvasPosition } from "./dom.js";
import { round } from "./math.js";

// Pixels across (and down) the area the magnifier shows.
const areaSize = 18;

// The top left of the size x size area of a width x height image centred on (x, y), moved in where
// needed so all of it is in the image.
export function magnifiedArea(x, y, size, width, height) {
    const clamp = (value, max) => Math.max(0, Math.min(max, value));
    return {x: clamp(x - Math.floor(size / 2), width - size), y: clamp(y - Math.floor(size / 2), height - size)};
}

// Examining pixels. The magnifier canvas follows the pointer over the image, showing the area around it,
// until a click or tap on the image stops it there, so the pointer can go to the magnifier; another
// click on the image sets it following again. A click on the magnifier shows that pixel's values: when it escaped, the point c it is, where its orbit z had got to, and its colour.
// hint says what to do next. The pixel data (imgData, xState, yState, escapeValues and
// imageEscapeValues, a value or four per pixel of the width x height display) is filled in by the
// renderer once examining starts.
export function createPixelExaminer({events, magnifier, hint, imgData, xState, yState, escapeValues, imageEscapeValues, width, height, state}) {
    const context = magnifier.getContext("2d");
    const blockSize = magnifier.width / areaSize;
    let examining = false;
    let chosen = null;          // the centre of the area the magnifier was stopped at, or null while following

    const showValue = (id, value) => { document.getElementById(id).textContent = value; };

    // Draws the area around centre, magnified, and returns its top left.
    function drawArea(centre) {
        const area = magnifiedArea(centre.x, centre.y, areaSize, width, height);
        for (let row = 0; row < areaSize; row += 1) {
            for (let column = 0; column < areaSize; column += 1) {
                const i = (((area.y + row) * width) + area.x + column) * 4;
                context.fillStyle = "rgb(" + imgData[i] + "," + imgData[i + 1] + "," + imgData[i + 2] + ")";
                context.fillRect(column * blockSize, row * blockSize, blockSize, blockSize);
            }
        }
        return area;
    }

    function outlinePixel(row, column) {
        context.lineWidth = 1;
        context.strokeStyle = "black";
        context.strokeRect((column * blockSize) - 0.5, (row * blockSize) - 0.5, blockSize + 1, blockSize + 1);
        context.strokeStyle = "lime";
        context.strokeRect((column * blockSize) + 0.5, (row * blockSize) + 0.5, blockSize - 1, blockSize - 1);
    }

    magnifier.onmousedown = function (e) {
        if (!examining || !chosen) return;
        const area = drawArea(chosen);
        const position = canvasPosition(magnifier, e);
        const column = Math.min(areaSize - 1, Math.floor(position.offsetX / blockSize));
        const row = Math.min(areaSize - 1, Math.floor(position.offsetY / blockSize));
        outlinePixel(row, column);

        const x = area.x + column;
        const y = area.y + row;
        const pixel = (y * width) + x;
        // The point c that was iterated, worked out the same way as the renderer places pixels.
        const view = state.getExtents();
        const cx = view.topLeft().x + (x * (view.width() / (width - 1)));
        const cy = view.topLeft().y + (y * (view.height() / (height - 1)));
        showValue("escapedAt", escapeValues[pixel]);
        showValue("imageEscapedAt", imageEscapeValues[pixel]);
        showValue("cx", Number(cx.toPrecision(15)));
        showValue("cy", Number(cy.toPrecision(15)));
        showValue("zx", round(xState[pixel], 9));
        showValue("zy", round(yState[pixel], 9));
        showValue("colourInfor", "r " + imgData[pixel * 4]);
        showValue("colourInfog", "g " + imgData[(pixel * 4) + 1]);
        showValue("colourInfob", "b " + imgData[(pixel * 4) + 2]);
    };

    events.listenTo(events.startExamining, function () {
        chosen = null;
        hint.textContent = "Getting the pixels…";
    });

    events.listenTo(events.pixelDataReady, function () {
        examining = true;
        hint.textContent = "Move over the image and the magnifier follows. Click or tap to stop it there.";
    });

    events.listenTo(events.examinePixelAt, function (point) {
        if (!examining) return;
        drawArea(point);
        if (chosen) {
            chosen = null;
            hint.textContent = "Move over the image and the magnifier follows. Click or tap to stop it there.";
        } else {
            chosen = {x: point.x, y: point.y};
            hint.textContent = "Click a pixel in the magnifier to see its values. Click the image again to carry on magnifying.";
        }
    });

    events.listenTo(events.pointerMoved, function (point) {
        if (examining && !chosen) {
            drawArea(point);
        }
    });

    events.listenTo(events.stopExamining, function () {
        examining = false;
        events.fire(events.start);
    });
}
