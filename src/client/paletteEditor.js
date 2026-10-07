import { fraction, hsvToRgb, toRgb } from "./palette.js";

// A palette node's colour as numbers: h in degrees, s and v from 0 to 1. Nodes from links can hold
// strings such as "88.9%", which are read the same way the palette reads them.
export function hsvOf(node) {
    return {h: parseFloat(node.hsv.h) || 0, s: fraction(node.hsv.s), v: fraction(node.hsv.v)};
}

// Where a pointer event is across and down element, each from 0 to 1.
export function fractionAcross(element, e) {
    const box = element.getBoundingClientRect();
    const clamp = (n) => Math.min(1, Math.max(0, n));
    return {x: clamp((e.clientX - box.left) / box.width), y: clamp((e.clientY - box.top) / box.height)};
}

const css = (colour) => "rgb(" + colour.r + "," + colour.g + "," + colour.b + ")";

// Calls onMove with each pointer event from a press on element until it is let go, so a drag keeps
// going even when the pointer leaves the element, with starting true for the press. Works the same for
// mouse, touch and pen.
function onDrag(element, onMove) {
    let dragging = null;        // the pointer dragging, if one is
    element.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        dragging = e.pointerId;
        try {
            element.setPointerCapture(e.pointerId);
        } catch {
            // Only pointers the browser knows are down can be captured; the drag works without.
        }
        element.focus();
        onMove(e, true);
    });
    element.addEventListener("pointermove", function (e) {
        if (e.pointerId === dragging) {
            onMove(e);
        }
    });
    const stop = (e) => { if (e.pointerId === dragging) dragging = null; };
    element.addEventListener("pointerup", stop);
    element.addEventListener("pointercancel", stop);
}

// The palette editor. The bar shows the palette, with a marker for each of its colours: drag a marker
// to move its colour along, and select one to change its colour with the picker, a square of
// saturation (across) and brightness (down) for the hue chosen on the hues strip. + adds a colour and −
// removes the selected one. Markers and the picker work from the keyboard too. Every change fires
// paletteChanged and showChanges, and the editor redraws whenever the palette changes.
export function createPaletteEditor({events, palette, bar, markerTrack, shades, hues, addButton, removeButton, blendSelect}) {
    const barContext = bar.getContext("2d");
    const shadesContext = shades.getContext("2d");
    const huesContext = hues.getContext("2d");
    const markers = new Map();      // node id -> marker button
    let selected = null;            // the selected node
    let hue = 0;                    // the hue the picker shows, kept when a colour is greyed out

    function changed() {
        events.fire(events.paletteChanged, palette);
        events.fire(events.showChanges);
    }

    // The colour bar, drawn from the palette itself so blends show exactly as they render.
    function drawBar() {
        const width = Math.max(1, Math.round(bar.clientWidth));
        if (bar.width !== width) {
            bar.width = width;
        }
        const strip = barContext.createImageData(width, bar.height);
        for (let x = 0; x < width; x += 1) {
            const colour = palette.colourAt(x / Math.max(1, width - 1));
            for (let y = 0; y < bar.height; y += 1) {
                const i = ((y * width) + x) * 4;
                strip.data[i] = colour.r;
                strip.data[i + 1] = colour.g;
                strip.data[i + 2] = colour.b;
                strip.data[i + 3] = 255;
            }
        }
        barContext.putImageData(strip, 0, 0);
    }

    function select(node) {
        selected = node;
        if (node) {
            const colour = hsvOf(node);
            if (colour.s > 0 && colour.v > 0) {
                hue = colour.h;
            }
        }
        update();
    }

    function marker(node) {
        let button = markers.get(node.id);
        if (button) return button;
        button = document.createElement("button");
        button.className = "marker";
        button.type = "button";
        let grabbedAt = 0;      // how far along the marker the press was, so it doesn't jump to the pointer
        onDrag(button, function (e, starting) {
            const along = fractionAcross(markerTrack, e).x;
            if (starting) {
                grabbedAt = along - node.position;
                return;
            }
            node.setPosition(Math.min(1, Math.max(0, along - grabbedAt)));
            palette.sort();
            changed();
        });
        button.addEventListener("keydown", function (e) {
            const step = e.shiftKey ? 0.1 : 0.01;
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const moved = node.position + (e.key === "ArrowLeft" ? -step : step);
                node.setPosition(Math.min(1, Math.max(0, moved)));
                palette.sort();
                changed();
            } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeSelected();
            }
        });
        button.addEventListener("focus", () => { if (selected !== node) select(node); });
        markers.set(node.id, button);
        markerTrack.appendChild(button);
        return button;
    }

    // Brings the markers, picker and controls into line with the palette.
    function update() {
        const nodes = palette.getNodes();
        if (selected && !nodes.includes(selected)) {
            selected = null;
        }
        if (!selected && nodes.length > 0) {
            selected = nodes[0];
            hue = hsvOf(selected).h;
        }
        const ids = new Set(nodes.map((node) => node.id));
        markers.forEach((button, id) => {
            if (!ids.has(id)) {
                button.remove();
                markers.delete(id);
            }
        });
        nodes.forEach(function (node) {
            const button = marker(node);
            const percent = Math.round(node.position * 100);
            button.style.left = (node.position * 100) + "%";
            button.style.background = css(toRgb(node.hsv));
            button.classList.toggle("selected", node === selected);
            button.setAttribute("aria-pressed", String(node === selected));
            button.setAttribute("aria-label", "Colour at " + percent + "%");
            button.title = "Colour at " + percent + "%: drag to move, or select to change it";
        });
        removeButton.disabled = !selected;
        blendSelect.value = palette.blend();
        drawBar();
        drawPicker();
    }

    function drawPicker() {
        const width = shades.width;
        const height = shades.height;
        const square = shadesContext.createImageData(width, height);
        const rgb = {};
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                hsvToRgb(hue, x / (width - 1), 1 - (y / (height - 1)), rgb);
                const i = ((y * width) + x) * 4;
                square.data[i] = rgb.r;
                square.data[i + 1] = rgb.g;
                square.data[i + 2] = rgb.b;
                square.data[i + 3] = 255;
            }
        }
        shadesContext.putImageData(square, 0, 0);

        const strip = huesContext.createImageData(hues.width, hues.height);
        for (let x = 0; x < hues.width; x += 1) {
            hsvToRgb((x / (hues.width - 1)) * 360, 1, 1, rgb);
            for (let y = 0; y < hues.height; y += 1) {
                const i = ((y * hues.width) + x) * 4;
                strip.data[i] = rgb.r;
                strip.data[i + 1] = rgb.g;
                strip.data[i + 2] = rgb.b;
                strip.data[i + 3] = 255;
            }
        }
        huesContext.putImageData(strip, 0, 0);

        // Where the selected colour is, and its hue.
        const hueX = (hue / 360) * (hues.width - 1);
        huesContext.lineWidth = 2;
        huesContext.strokeStyle = "black";
        huesContext.strokeRect(hueX - 2, 0, 4, hues.height);
        huesContext.strokeStyle = "white";
        huesContext.strokeRect(hueX - 1, 1, 2, hues.height - 2);
        if (selected) {
            const colour = hsvOf(selected);
            const x = colour.s * (width - 1);
            const y = (1 - colour.v) * (height - 1);
            shadesContext.lineWidth = 2;
            shadesContext.strokeStyle = "black";
            shadesContext.beginPath();
            shadesContext.arc(x, y, 6, 0, 2 * Math.PI);
            shadesContext.stroke();
            shadesContext.strokeStyle = "white";
            shadesContext.beginPath();
            shadesContext.arc(x, y, 4, 0, 2 * Math.PI);
            shadesContext.stroke();
        }
        shades.setAttribute("aria-valuetext", selected ? describe(hsvOf(selected)) : "No colour selected");
        hues.setAttribute("aria-valuenow", String(Math.round(hue)));
    }

    function describe(colour) {
        return "Saturation " + Math.round(colour.s * 100) + "%, brightness " + Math.round(colour.v * 100) + "%";
    }

    function setColour(colour) {
        if (!selected) return;
        selected.setColour(colour);
        changed();
    }

    onDrag(shades, function (e) {
        const at = fractionAcross(shades, e);
        setColour({h: hue, s: at.x, v: 1 - at.y});
    });

    onDrag(hues, function (e) {
        hue = fractionAcross(hues, e).x * 360;
        const colour = selected ? hsvOf(selected) : null;
        if (colour) {
            setColour({h: hue, s: colour.s, v: colour.v});
        } else {
            drawPicker();
        }
    });

    shades.addEventListener("keydown", function (e) {
        if (!selected) return;
        const colour = hsvOf(selected);
        const step = e.shiftKey ? 0.1 : 0.02;
        const moves = {ArrowLeft: ["s", -step], ArrowRight: ["s", step], ArrowUp: ["v", step], ArrowDown: ["v", -step]};
        const move = moves[e.key];
        if (move) {
            e.preventDefault();
            colour[move[0]] = Math.min(1, Math.max(0, colour[move[0]] + move[1]));
            setColour({h: hue, s: colour.s, v: colour.v});
        }
    });

    hues.addEventListener("keydown", function (e) {
        const step = e.shiftKey ? 30 : 5;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            hue = (hue + (e.key === "ArrowLeft" ? -step : step) + 360) % 360;
            const colour = selected ? hsvOf(selected) : null;
            if (colour) {
                setColour({h: hue, s: colour.s, v: colour.v});
            } else {
                drawPicker();
            }
        }
    });

    addButton.onclick = function () {
        selected = palette.addNode();
        hue = hsvOf(selected).h;
        changed();
        marker(selected).focus();
    };

    function removeSelected() {
        if (!selected) return;
        const index = palette.getNodes().indexOf(selected);
        palette.removeNode(selected);
        const nodes = palette.getNodes();
        selected = nodes[Math.min(index, nodes.length - 1)] || null;
        changed();
        if (selected) {
            marker(selected).focus();
        }
    }
    removeButton.onclick = removeSelected;

    blendSelect.onchange = function () {
        palette.setBlend(blendSelect.value);
        changed();
    };

    events.listenTo(events.paletteChanged, update);
    // The bar is drawn at its size on the page, so is redrawn when that changes.
    new ResizeObserver(drawBar).observe(bar);
    update();
}
