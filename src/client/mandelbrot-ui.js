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
    var round = jim.common.round;
    var gridSize  = 9;
    var calculateFillStyle = function (colour) {
        return "rgba(" + round(colour.r, 0) + "," + round(colour.g, 0) + ","  + round(colour.b, 0) + "," + round(colour.a, 0) +")";
    };

    var drawBigPixel = function (x, y, w, h, colour) {
        myContext.fillStyle = calculateFillStyle(colour);
        myContext.fillRect(x, y, w, h);
    };
    var setText = function (id, text) {
        document.getElementById(id).textContent = text;
    };

    var currentX = 0;
    var currentY = 0;
    myContext = pixelInfo.getContext('2d');

    myContext.strokeStyle = ("rgba(0,255,0,255)");
    myContext.strokeRect(0,0, pixelInfo.width, pixelInfo.height);


    var drawRow = function (_gridSize, _increment, _rowNumber, x, y) {
        var rowStart =  x - Math.floor(gridSize / 2);
        var colStart =  y - Math.floor(gridSize / 2);
        for (var i = 0 ; i < _gridSize; i ++) {
            drawBigPixel(_increment * i, _increment * _rowNumber, _increment, _increment, mset.state().currentPointColour(rowStart + i, colStart + _rowNumber));
        }
    };
    var update = function (x, y) {
        myContext = pixelInfo.getContext('2d');
        var increment = pixelInfo.width / gridSize;
        currentX = x;
        currentY = y;

        for (var i = 0; i < gridSize; i++) {
            drawRow(gridSize, increment, i, x, y);
        }

        myContext.strokeStyle = ("rgba(0,255,0,255)");
        myContext.strokeRect(0,0, pixelInfo.width, pixelInfo.height);
    };

    pixelInfo.onmousedown = function (e) {
        console.log("mouse down on pixel info");

        var squareSize = pixelInfo.width / gridSize;



        var row = Math.floor(e.layerY / squareSize);
        var column = Math.floor(e.layerX / squareSize);

        var rowStart =  currentX - Math.floor(gridSize / 2);
        var colStart =  currentY - Math.floor(gridSize / 2);

        var point = mset.point(rowStart + column, colStart + row);
        update(currentX, currentY);

        myContext.strokeStyle = ("rgba(0,255,0,255)");
        myContext.strokeRect(column * squareSize ,row * squareSize, squareSize, squareSize);


        setText("iterations", "" + point.iterations);
        setText("escapedAt", point.escapedAt);
        setText("alreadyEscaped", point.alreadyEscaped);
        setText("pixelComplete", point.complete);
        setText("mx", point.mx);
        setText("my", point.my);
        setText("histogramPerc", mset.histogram().percentEscapedBy(point.iterations));
        setText("colourInfo", mset.state().currentPointColour(currentX + column, currentY + row));

        console.log("row :" + row + " column : " + column);
    };

    return {
        update: update
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
        return false;
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
            console.log("ello");
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