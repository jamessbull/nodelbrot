namespace("jim.mandelbrot.examinePixelStateDisplay");
jim.mandelbrot.examinePixelStateDisplay.create = function (_events, _examinePixelCanvas, _imgData, _xState, _yState, _escapeValues, _imageEscapeValues, _sourceWidth) {
    "use strict";
    var examiningPixels = false;
    var myContext = _examinePixelCanvas.getContext('2d');
    var round = jim.common.round;
    var magnifiedAreaWidth  = 19;

    var calculateFillStyle = function (colour) {
        return "rgba(" + round(colour.r, 0) + "," + round(colour.g, 0) + ","  + round(colour.b, 0) + "," + round(colour.a, 0) +")";
    };

    var setText = function (id, text) {
        document.getElementById(id).textContent = text;
    };

    myContext = _examinePixelCanvas.getContext('2d');
    myContext.strokeStyle = ("rgba(0,255,0,255)");
    myContext.strokeRect(0,0, _examinePixelCanvas.width, _examinePixelCanvas.height);

    function drawRow (_magnifiedAreaWidth, _pixelsPerBlock, _startOfCurrentRow, _bpy) {
        for (var i = 0 ; i < _magnifiedAreaWidth; i ++) {

            var index = (_startOfCurrentRow + i) * 4;
            var colour = {r: _imgData[index], g:_imgData[index + 1], b:_imgData[index + 2], a:_imgData[index + 3]};
            myContext.fillStyle = calculateFillStyle(colour);
            myContext.fillRect(_pixelsPerBlock * i, _bpy, _pixelsPerBlock, _pixelsPerBlock);
        }
    }

    function updateMagnifiedDisplay(_sourceX, _sourceY, _targetWidth, _magnifiedAreaWidth, _sourceWidth) {
        var pixelsPerBlock = Math.round(_targetWidth / _magnifiedAreaWidth);
        for (var i = 0; i < _magnifiedAreaWidth; i++) {
            var startOfCurrentRow = _sourceX + ((_sourceY + i) * _sourceWidth);

            drawRow(_magnifiedAreaWidth, pixelsPerBlock, startOfCurrentRow, pixelsPerBlock * i);
        }
    }

    on(_events.publishPixelState, function () {
        examiningPixels = true;
    });

    on(_events.mouseMoved, function (movement) {
        var targetWidth = _examinePixelCanvas.width, targetHeight = _examinePixelCanvas.height;
        var magnifyingGlassCenterOffsetx = 20;
        var magnifyingGlassCenterOffsety = 12;
        var sourceX =  movement.x + magnifyingGlassCenterOffsetx - Math.floor(magnifiedAreaWidth / 2);
        var sourceY =  movement.y + magnifyingGlassCenterOffsety - Math.floor(magnifiedAreaWidth / 2);

        if(examiningPixels) {
            updateMagnifiedDisplay(sourceX, sourceY, targetWidth, magnifiedAreaWidth, _sourceWidth);
            myContext.strokeStyle = ("rgba(0,255,0,255)");
            myContext.strokeRect(0,0, targetWidth, targetHeight);
        }
    });

    on(_events.stopExaminingPixelState, function () {
        examiningPixels = false;
    });
};