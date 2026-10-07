import { createSimpleImage } from "./image.js";
import { interpolate } from "./math.js";
import { fraction, toRgb } from "./palette.js";
import { forwardTouchToMouse } from "./ui/touch.js";
import { canvasPosition } from "./dom.js";

export function createColourPicker(canvas, gradient, events) {
    const on = events.listenTo;
    const image = createSimpleImage(canvas);
    const w = canvas.width;
    const h = canvas.height;
    let selectedHue;

    // The top 30% of the picker is a strip of hues. Below it are shades of the selected hue: saturation
    // increases downwards and value decreases to the right. Drawing, clicking and placing markers all go
    // through these, so what is picked is what is shown.
    const hueStripHeight = 0.3 * h;
    const shadeHeight = h - hueStripHeight;

    function isInHueStrip(y) {
        return y <= hueStripHeight;
    }

    function hueAt(x) {
        return interpolate(0, 359, x / w);
    }

    function shadeAt(x, y) {
        return {h: selectedHue, s: interpolate(0, 1, (y - hueStripHeight) / shadeHeight), v: interpolate(1, 0, x / w)};
    }

    // Where a colour is among the shades.
    function shadePosition(hsv) {
        return {x: (1 - fraction(hsv.v)) * w, y: hueStripHeight + (fraction(hsv.s) * shadeHeight)};
    }

    const drawColourPicker = function (x, y) {
        return toRgb(isInHueStrip(y) ? {h: hueAt(x), s: 1, v: 1} : shadeAt(x, y));
    };

    const draw = function () {
        image.drawXY(drawColourPicker);
    };

    on(events.colourSelected, function (pos) {
        const context = canvas.getContext('2d');
        selectedHue = pos.hue;
        draw();

        if(pos.y >= h) pos.y = h - 4;
        if(pos.x === 0) pos.x = 4;

        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
        context.closePath();
    });

    // Sets the selected marker to the colour picked at the mouse event or touch.
    function drawPicker(event) {
        const e = canvasPosition(canvas, event);
        let colour;
        if (isInHueStrip(e.offsetY)) {
            selectedHue = hueAt(e.offsetX);
            colour = {h: selectedHue, s: 1, v: 1};
        } else {
            colour = shadeAt(e.offsetX, e.offsetY);
        }
        gradient.setSelectedNodeColour(colour, e.offsetX, e.offsetY);
        events.fire(events.colourSelected, {x: e.offsetX, y: e.offsetY, hue: selectedHue});
        events.fire(events.pulseUI);
    }

    function randomNumberBetween(x, y) {
        return interpolate(x, y, Math.random());
    }

    on(events.nodeAdded, function (n) {
        let position;
        if (n.doNotRandomise) {
            // A marker with a colour already (from a link): show where its colour is on the picker,
            // keeping the colour exactly as it was saved.
            selectedHue = parseFloat(n.node.hsv.h);
            position = shadePosition(n.node.hsv);
            gradient.setSelectedNodeMarker(position.x, position.y);
            events.fire(events.colourSelected, {x: position.x, y: position.y, hue: selectedHue});
            return;
        }
        // A new marker: a random hue, at full value and a random saturation.
        selectedHue = randomNumberBetween(0, 359);
        position = {x: 0, y: randomNumberBetween(hueStripHeight, h)};
        gradient.setSelectedNodeColour(shadeAt(position.x, position.y), position.x, position.y);
        events.fire(events.colourSelected, {x: position.x, y: position.y, hue: selectedHue});
        events.fire(events.pulseUI, {});
    });

    canvas.onclick = function (e) {
        drawPicker(e);
    };

    // Only the start of a touch picks a colour.
    forwardTouchToMouse(canvas, {down: drawPicker});

    selectedHue = 120;
    return {
        draw: draw
    };
}
