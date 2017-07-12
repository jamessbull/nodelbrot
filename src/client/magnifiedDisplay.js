namespace("jim.mandelbrot.examinePixelStateDisplay");
jim.mandelbrot.examinePixelStateDisplay.create = function (_events, _examinePixelCanvas, _imgData, _xState, _yState, _escapeValues, _imageEscapeValues, _sourceWidth) {
    "use strict";
    var examiningPixels = false;
    var myContext = _examinePixelCanvas.getContext('2d');
    var round = jim.common.round;
    var magnifiedAreaWidth  = 18;
    var areaHasBeenSelected = false;
    var selectedArea;
    var histogramForColour = jim.twoPhaseHistogram.create(0);

    var calculateFillStyle = function (colour) {
        return "rgba(" + round(colour.r, 0) + "," + round(colour.g, 0) + ","  + round(colour.b, 0) + "," + round(colour.a, 0) +")";
    };

    var setText = function (id, text) {
        document.getElementById(id).textContent = text;
    };

    myContext = _examinePixelCanvas.getContext('2d');
    myContext.strokeStyle = ("rgba(0,255,0,255)");
    myContext.strokeRect(0,0, _examinePixelCanvas.width, _examinePixelCanvas.height);

    function xyToIndex(_x, _y, _width) {
        return (_y * _width) + _x;
    }

    function extractPointFromData(i) {
        var imageIndex = i * 4;
        var colour = {r: _imgData[imageIndex], g:_imgData[imageIndex + 1], b: _imgData[imageIndex + 2], a: _imgData[imageIndex +3]};
        return {
            colour: colour,
            xState: _xState[i],
            yState: _yState[i],
            escapedAt: _escapeValues[i],
            imageEscapedAt: _imageEscapeValues[i]
        };
    }

    function pointSequence(_startIndex, _number, _y) {
        var seq = [];
        for (var i = 0; i < _number ; i +=1) {
            var item = extractPointFromData(_startIndex + i);
            item.x = i;
            item.y = _y;
            seq.push(item);
        }
        return seq;
    }

    function extractData(_x, _y, _displayWidth, _numberToTake) {
        var points = [];
        for (var i = 0; i < _numberToTake; i +=1) {
            var startIndex = xyToIndex(_x, _y + i, _displayWidth);
            var nextRow = pointSequence(startIndex, _numberToTake, i);
            points = points.concat(nextRow);
        }
        return points;
    }

    function drawSelectionOutline(_rect) {
        myContext.strokeStyle = ("rgba(0,255,0,255)");
        myContext.strokeRect(_rect.x ,_rect.y, _rect.width(),  _rect.height());
        myContext.strokeStyle = ("rgba(0,0,0,255)");
        myContext.strokeRect(_rect.x - 1 ,_rect.y - 1, _rect.width() + 2,  _rect.height() + 2);
    }

    function selectSquare(_row, _column, _squareSize) {
        var selectedSquare = jim.rectangle.create(_column * _squareSize, _row * _squareSize, _squareSize, _squareSize);
        drawSelectionOutline(selectedSquare);
    }

    _examinePixelCanvas.onmousedown = function (e) {
        if (!examiningPixels) return;
        console.log("mouse down on pixel info");

        drawMagnifiedPixels(_examinePixelCanvas, selectedArea, magnifiedAreaWidth, _sourceWidth);

        var squareSize = Math.round(_examinePixelCanvas.width / magnifiedAreaWidth);
        var row = Math.floor(e.layerY / squareSize);
        var column = Math.floor(e.layerX / squareSize);

        selectSquare(row, column, squareSize);
        var topLeft = centreToTopLeft(selectedArea, magnifiedAreaWidth);
        var points = extractData(topLeft.x, topLeft.y, _sourceWidth, magnifiedAreaWidth);
        var pointsIndex = (row * magnifiedAreaWidth) + column;
        var point = points[pointsIndex];

        setText("escapedAt", point.escapedAt);
        setText("imageEscapedAt", point.imageEscapedAt);
        setText("mx", round(point.xState, 9));
        setText("my", round(point.yState, 9));
        setText("colourInfor", "r:" + round(point.colour.r,3));
        setText("colourInfog", "g:" + round(point.colour.g, 3));
        setText("colourInfob", "b:" + round(point.colour.b,3));
    };

    function centreToTopLeft(_point, _width) {
        var magnifyingGlassCenterOffsetx = 20;
        var magnifyingGlassCenterOffsety = 12;

        var sourceX =  _point.x + magnifyingGlassCenterOffsetx - Math.floor(_width / 2);
        var sourceY =  _point.y + magnifyingGlassCenterOffsety - Math.floor(_width / 2);
        return {x: sourceX,y: sourceY};
    }

    function drawMagnifiedPixels(_canvas, _centre, _magnifiedAreaWidth, _sourceWidth) {
        var topLeft = centreToTopLeft(_centre, _magnifiedAreaWidth);
        var points  = extractData(topLeft.x, topLeft.y, _sourceWidth, _magnifiedAreaWidth);
        var pixelsPerBlock = Math.round(_canvas.width / _magnifiedAreaWidth);

        points.forEach(function (point) {
            myContext.fillStyle = calculateFillStyle(point.colour);
            myContext.fillRect(point.x * pixelsPerBlock, point.y * pixelsPerBlock, pixelsPerBlock, pixelsPerBlock);
        });
    }

    on(_events.histogramUpdated, function (update) {
        histogramForColour.setData(update.array, update.total);
    });

    on(_events.publishPixelState, function () {
        examiningPixels = true;
    });

    on(_events.examinePixelAction, function (e) {
       areaHasBeenSelected = !areaHasBeenSelected;
       selectedArea = jim.rectangle.create(e.x, e.y, magnifiedAreaWidth, magnifiedAreaWidth);
    });

    on(_events.mouseMoved, function (movement) {
        if (!examiningPixels) return;
        if (areaHasBeenSelected) return;

        drawMagnifiedPixels(_examinePixelCanvas, movement, magnifiedAreaWidth, _sourceWidth);
    });

    on(_events.stopExaminingPixelState, function () {
        examiningPixels = false;
    });
};