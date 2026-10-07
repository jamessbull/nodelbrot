import { rectangle } from "./geometry.js";
import { round } from "./math.js";

// The top left of the size x size area of a width x height image centred on (x, y), moved in where
// needed so all of it is in the image.
export function magnifiedArea(x, y, size, width, height) {
    const clamp = (value, max) => Math.max(0, Math.min(max, value));
    return {x: clamp(x - Math.floor(size / 2), width - size), y: clamp(y - Math.floor(size / 2), height - size)};
}

export function createPixelExaminer(_events, _examinePixelCanvas, _imgData, _xState, _yState, _escapeValues, _imageEscapeValues, _sourceWidth, _uiCanvas, _sourceHeight, _state) {
    const on = _events.listenTo;
    let examiningPixels = false;
    let myContext = _examinePixelCanvas.getContext('2d');
    const magnifiedAreaWidth  = 18;
    let areaHasBeenSelected = false;
    let selectedArea;

    const calculateFillStyle = function (colour) {
        return "rgba(" + round(colour.r, 0) + "," + round(colour.g, 0) + ","  + round(colour.b, 0) + "," + round(colour.a, 0) +")";
    };

    const setText = function (id, text) {
        document.getElementById(id).textContent = text;
    };

    myContext = _examinePixelCanvas.getContext('2d');
    myContext.strokeStyle = ("rgba(0,255,0,255)");
    myContext.strokeRect(0,0, _examinePixelCanvas.width, _examinePixelCanvas.height);

    function xyToIndex(_x, _y, _width) {
        return (_y * _width) + _x;
    }

    function extractPointFromData(i) {
        const imageIndex = i * 4;
        const colour = {r: _imgData[imageIndex], g:_imgData[imageIndex + 1], b: _imgData[imageIndex + 2], a: _imgData[imageIndex +3]};
        return {
            colour: colour,
            xState: _xState[i],
            yState: _yState[i],
            escapedAt: _escapeValues[i],
            imageEscapedAt: _imageEscapeValues[i]
        };
    }

    function pointSequence(_startIndex, _number, _y) {
        const seq = [];
        for (let i = 0; i < _number ; i +=1) {
            const item = extractPointFromData(_startIndex + i);
            item.x = i;
            item.y = _y;
            seq.push(item);
        }
        return seq;
    }

    function extractData(_x, _y, _displayWidth, _numberToTake) {
        let points = [];
        for (let i = 0; i < _numberToTake; i +=1) {
            const startIndex = xyToIndex(_x, _y + i, _displayWidth);
            const nextRow = pointSequence(startIndex, _numberToTake, i);
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
        const selectedSquare = rectangle(_column * _squareSize, _row * _squareSize, _squareSize, _squareSize);
        drawSelectionOutline(selectedSquare);
    }

    _examinePixelCanvas.onmousedown = function (e) {
        if (!examiningPixels || !selectedArea) return;

        displayAdditionalMessage("Click main image to start examining");
        drawMagnifiedPixels(_examinePixelCanvas, selectedArea, magnifiedAreaWidth, _sourceWidth);

        const squareSize = Math.round(_examinePixelCanvas.width / magnifiedAreaWidth);
        const row = Math.floor(e.offsetY / squareSize);
        const column = Math.floor(e.offsetX / squareSize);

        selectSquare(row, column, squareSize);
        const topLeft = centreToTopLeft(selectedArea, magnifiedAreaWidth);
        const points = extractData(topLeft.x, topLeft.y, _sourceWidth, magnifiedAreaWidth);
        const pointsIndex = (row * magnifiedAreaWidth) + column;
        const point = points[pointsIndex];

        // The point c that was iterated, worked out the same way as the renderer places pixels.
        const view = _state.getExtents();
        const cx = view.topLeft().x + ((topLeft.x + column) * (view.width() / (_sourceWidth - 1)));
        const cy = view.topLeft().y + ((topLeft.y + row) * (view.height() / (_sourceHeight - 1)));

        setText("escapedAt", point.escapedAt);
        setText("imageEscapedAt", point.imageEscapedAt);
        setText("cx", Number(cx.toPrecision(15)));
        setText("cy", Number(cy.toPrecision(15)));
        setText("zx", round(point.xState, 9));
        setText("zy", round(point.yState, 9));
        setText("colourInfor", "r:" + round(point.colour.r,3));
        setText("colourInfog", "g:" + round(point.colour.g, 3));
        setText("colourInfob", "b:" + round(point.colour.b,3));
    };

    function centreToTopLeft(_point, _width) {
        return magnifiedArea(_point.x, _point.y, _width, _sourceWidth, _sourceHeight);
    }

    function drawMagnifiedPixels(_canvas, _centre, _magnifiedAreaWidth, _sourceWidth) {
        const topLeft = centreToTopLeft(_centre, _magnifiedAreaWidth);
        const points  = extractData(topLeft.x, topLeft.y, _sourceWidth, _magnifiedAreaWidth);
        const pixelsPerBlock = Math.round(_canvas.width / _magnifiedAreaWidth);

        points.forEach(function (point) {
            myContext.fillStyle = calculateFillStyle(point.colour);
            myContext.fillRect(point.x * pixelsPerBlock, point.y * pixelsPerBlock, pixelsPerBlock, pixelsPerBlock);
        });
    }

    function displayMessage(msg, x, y) {
        const context = _uiCanvas.getContext('2d');
        context.clearRect(x, y, _uiCanvas.width, _uiCanvas.height);
        context.font = "14px courier";
        context.strokeStyle = "rgba(0,0,0,255)";
        context.fillStyle = "rgba(255,255,255,255)";
        context.lineWidth = 3;
        context.strokeText(msg, x, y);
        context.fillText(msg, x, y);

    }

    function topLevelMessage(msg) {
        const context = _uiCanvas.getContext('2d');
        context.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
        displayMessage(msg, 15, 15);
    }

    function displayAdditionalMessage(msg) {
        const context = _uiCanvas.getContext('2d');
        context.clearRect(0, 20, _uiCanvas.width - 25, _uiCanvas.height - 25);
        displayMessage(msg, 30, 30);
    }

    on(_events.pixelDataReady, function () {
        examiningPixels = true;
        topLevelMessage("Examine pixels mode. (Click examine button to leave)");
        displayAdditionalMessage("Click the left button on the image to select an area");
    });

    on(_events.examinePixelAt, function (e) {
       areaHasBeenSelected = !areaHasBeenSelected;
       if (areaHasBeenSelected) {
           displayAdditionalMessage("Click on magnified image to examine a pixel");
       } else {
           displayAdditionalMessage("Click the left button on the image to select an area");
       }
       selectedArea = rectangle(e.x, e.y, magnifiedAreaWidth, magnifiedAreaWidth);
    });

    on(_events.pointerMoved, function (movement) {
        if (!examiningPixels) return;

        if (areaHasBeenSelected) return;

        drawMagnifiedPixels(_examinePixelCanvas, movement, magnifiedAreaWidth, _sourceWidth);
    });

    on(_events.stopExamining, function () {
        examiningPixels = false;
        topLevelMessage("Leaving examine pixels mode");
        setTimeout(function () {_uiCanvas.getContext('2d').clearRect(0,0, _uiCanvas.width, _uiCanvas.height);}, 1000);
        _events.fire(_events.start);
    });
}
