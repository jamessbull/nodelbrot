namespace("jim.colour.colourPicker");
jim.colour.colourPicker.create = function (canvas, gradient, events) {
    "use strict";
    var image = jim.image.createSimpleImage(canvas);
    var interpolate = jim.interpolator.create().interpolate;
    var w = canvas.width;
    var h = canvas.height;
    var selectedHue;

    var huePicker = function (x) {
        var hue = interpolate(0, 359, x / w);
        return jim.colour.toRgb({h: hue, s: 1, v: 1});
    };

    var shade = function (x, y, verticalSize) {
        var heightOffset = h - verticalSize;
        var translatedY = y - heightOffset;
        var saturation = interpolate(0, 1, (translatedY / verticalSize));

        var value = interpolate(1, 0, x / w);
        return {h: selectedHue, s: saturation, v: value};
    };

    var shadePicker = function (x, y, verticalSize) {
        var heightOffset = h - verticalSize;
        var translatedY = y - heightOffset;
        var saturation = interpolate(0, 1, (translatedY / verticalSize));

        var value = interpolate(1, 0, x / w);
        return jim.colour.toRgb({h: selectedHue, s: saturation, v: value});
    };

    var drawColourPicker = function (x, y) {
        var hueProportion = 0.3 * h;
        var shadeProportion = h - hueProportion;
        return y <= hueProportion ? huePicker(x) : shadePicker(x, y, shadeProportion);
    };

    var draw = function () {
        image.drawXY(drawColourPicker);
    };

    on(events.colourSelected, function (pos) {
        var context = canvas.getContext('2d');
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

    function drawPicker(e) {

        if (e.offsetY <= h / 3) {
            selectedHue = interpolate(0, 359, e.offsetX / w);
            //draw();
            gradient.setSelectedNodeColour({h: selectedHue, s: 1, v: 1}, e.offsetX, e.offsetY);
            events.fire(events.colourSelected, {x: e.offsetX, y: e.offsetY, hue: selectedHue});

        } else {
            var hueProportion = 0.3 * h;
            var shadeProportion = h - hueProportion;
            gradient.setSelectedNodeColour(shade(e.offsetX, e.offsetY, shadeProportion), e.offsetX, e.offsetY);
            events.fire(events.colourSelected, {x: e.offsetX, y: e.offsetY, hue: selectedHue});
        }
        events.fire(events.pulseUI);
    }

    function randomNumberBetween(x, y) {
        return interpolate(x, y, Math.random());
    }

    on(events.nodeAdded, function (n) {
        var shadeVal = (Math.floor((h / 3)));
        var hueProportion = Math.floor(0.3333333 * h);
        var shadeProportion = h - hueProportion;
        var shadeX = 0, shadeY = randomNumberBetween(shadeVal, h);
        selectedHue = randomNumberBetween(0, 359);

        if (n.doNotRandomise) {
            // A marker with a colour already (from a link): show where its colour is on the picker,
            // keeping the colour exactly as it was saved.
            shadeX = (1 - jim.colour.fraction(n.node.hsv.v)) * w;
            shadeY = shadeVal + (jim.colour.fraction(n.node.hsv.s) * shadeProportion);
            selectedHue = parseFloat(n.node.hsv.h);
            gradient.setSelectedNodeMarker(shadeX, shadeY);
            events.fire(events.colourSelected, {x: shadeX, y: shadeY, hue: selectedHue});
            return;
        }
        gradient.setSelectedNodeColour(shade(shadeX, shadeY, shadeProportion), shadeX, shadeY);
        events.fire(events.colourSelected, {x: shadeX, y: shadeY, hue: selectedHue});
        events.fire(events.pulseUI, {});
    });

    canvas.onclick = function (e) {
        drawPicker(e);
    };

    // Only the start of a touch picks a colour.
    jim.touch.forwardToMouse(canvas, {down: drawPicker});

    selectedHue = 120;
    return {
        draw: draw
    };
};