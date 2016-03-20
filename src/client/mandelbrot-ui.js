namespace("jim.mandelbrot.ui.state");
jim.mandelbrot.ui.state.create = function () {
    "use strict";
    var mode = "normal";
    return {
        isSelectPixelMode : function () {
            return mode === "selectPixel";
        },
        setSelectPixelMode: function () {
            mode = "selectPixel";
        },
        setNormalMode: function () {
            mode = "normal";
        }
    };
};

namespace("jim.mandelbrot.ui.magnifiedDisplay");
jim.mandelbrot.ui.magnifiedDisplay.create = function (mset, pixelInfo) {
    "use strict";
    var myContext;
    var gridSize  = 3;
    var calculateFillStyle = function (point) {
        return "rgba(" + point.colour.r + "," + point.colour.g + ","  + point.colour.b + "," + point.colour.a +")";
    };
    var drawBigPixel = function (x, y, w, h, point) {
        myContext.fillStyle = calculateFillStyle(point);
        myContext.fillRect(x, y, w, h);
    };
    var setText = function (id, text) {
        document.getElementById(id).textContent = text;
    };

    var currentX = 0;
    var currentY = 0;

    pixelInfo.onmousedown = function (e) {
        console.log("mouse down on pixel info");

        var squareSize = pixelInfo.width / gridSize;

        var row = Math.floor(e.layerY / squareSize)-1;
        var column = Math.floor(e.layerX / squareSize)-1;

        var point = mset.point(currentX + column, currentY + row);

        setText("iterations", "Iterations so far : " + point.iterations);
        setText("escapedAt", "escaped at : " + point.escapedAt);
        setText("alreadyEscaped", "already escaped : " + point.alreadyEscaped);
        setText("pixelComplete", "complete : " + point.complete);
        setText("mx", "mx : " + point.mx);
        setText("my", "my : " + point.my);
        setText("histogramPerc", "percent escaped By  : " + mset.histogram().percentEscapedBy(point.iterations));
        setText("colourInfo", "Colour Info: " + mset.palette().getUsefulNumbersMessage(point, mset.histogram()));

        console.log("row :" + row + " column : " + column);
    };

    return {
        update: function (x, y) {
            myContext = pixelInfo.getContext('2d');
            var increment = pixelInfo.width / gridSize;
            currentX = x;
            currentY = y;

            drawBigPixel(increment * 0, increment * 0, increment, increment, mset.point(x - 1, y - 1));
            drawBigPixel(increment * 1, increment * 0, increment, increment, mset.point(x, y - 1));
            drawBigPixel(increment * 2, increment * 0, increment, increment, mset.point(x + 1, y - 1));

            drawBigPixel(increment * 0, increment * 1, increment, increment, mset.point(x - 1, y));
            drawBigPixel(increment * 1, increment * 1, increment, increment, mset.point(x, y));
            drawBigPixel(increment * 2, increment * 1, increment, increment, mset.point(x + 1, y));

            drawBigPixel(increment * 0, increment * 2, increment, increment, mset.point(x - 1, y + 1));
            drawBigPixel(increment * 1, increment * 2, increment, increment, mset.point(x, y + 1));
            drawBigPixel(increment * 2, increment * 2, increment, increment, mset.point(x + 1, y + 1));
        }
    };
};

jim.mandelbrot.ui.create = function (mandelbrotSet, canvas, w, h, pixelInfo, areaNotifier) {
    "use strict";
    var state = jim.mandelbrot.ui.state.create(),
        magnifiedDisplay = jim.mandelbrot.ui.magnifiedDisplay.create(mandelbrotSet, pixelInfo),
        rect = jim.rectangle.create,
        newSelection = jim.selection.create,
        selection = newSelection(rect(0, 0, w, h)),
        timer = jim.stopwatch.create(),
        zoomAction = jim.actions.selectArea.create(selection, mandelbrotSet, state, areaNotifier),
        doubleClickAction = jim.actions.doubleclick.create(timer, mandelbrotSet, state),
        moveAction = jim.actions.move.create(mandelbrotSet, state, areaNotifier),
        showPointDetailsAction = jim.actions.show.create(magnifiedDisplay, state),
        actions = [zoomAction, doubleClickAction, moveAction, showPointDetailsAction],
        mode = "normal";

    canvas.onmousedown = function (e) {
        if (e.button === 0)
            actions.forEach(function (action) {action.leftMouseDown(e);});
        if (e.button === 2)
            actions.forEach(function (action) { action.rightMouseDown(e);});
    };

    canvas.onmouseup = function (e) {
        actions.forEach(function (action) {
            if (e.button === 0)
                action.leftMouseUp(e, mode);
            if (e.button === 2)
                action.rightMouseUp(e, mode);
        });
    };

    canvas.onmousemove = function (e) {
        actions.forEach(function (action) {action.moveMouse(e);});
    };

    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            //var context1 = mandelbrotSet.canvas().getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.show(context);
            moveAction.show(context, canvas);
        },
        actions: actions,
        canvas: canvas,
        handlePixelInfo: function () {
            var canvasDiv = document.getElementById("mandelbrotCanvas");
            if (canvasDiv.style.cursor!=="crosshair") {
                canvasDiv.style.cursor="crosshair";
                state.setSelectPixelMode();
            } else {
                canvasDiv.style.cursor="default";
                state.setNormalMode();
            }
        }
    };
};