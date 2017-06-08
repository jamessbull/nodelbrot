namespace("jim.mandelbrot.ui.actions.zoomOutAnimation");
jim.mandelbrot.ui.actions.zoomOutAnimation.create = function (_uiCanvas, _mandelbrotCanvas, _selectionBox ) {
    "use strict";
    var duration = 40;
    var selectionLength = 30;

    var uiCtx = _uiCanvas.getContext('2d');

    function newMatchingCanvas(_originalCanvas) {
        var matchingCanvas = document.createElement('canvas');
        matchingCanvas.width = _originalCanvas.width;
        matchingCanvas.height = _originalCanvas.height;
        return matchingCanvas;
    }

    function currentPosition(x, _currentStep, _totalSteps) {
        return ((x / _totalSteps) * _currentStep);
    }

    function targetDimensions(_start, _diff, _currentStep, _totalSteps) {
        var x = _start.x + currentPosition(_diff.x, _currentStep, _totalSteps);
        var y = _start.y + currentPosition(_diff.y, _currentStep, _totalSteps);
        var w = _start.width() + currentPosition(_diff.width(), _currentStep, _totalSteps);
        var h = _start.height() + currentPosition(_diff.height(), _currentStep, _totalSteps);
        return jim.rectangle.create(x, y, w, h);
    }

    function zoomOut(i, _oldCanvas, _uiCanvas, _currentZoomLevel, _targetZoomLevel) {
        var lastImageDimensions = jim.rectangle.create(0,0, _uiCanvas.width, _uiCanvas.height);
        var firstImageDimensions = _targetZoomLevel.translateFrom(_currentZoomLevel).to(lastImageDimensions);
        var diff = lastImageDimensions.difference(firstImageDimensions);

        var target = targetDimensions(firstImageDimensions, diff, i, duration);

        uiCtx.drawImage(_mandelbrotCanvas, target.x, target.y, target.width(), target.height());
    }

    function drawSelectionOutline(i, _uiCanvas, _selectionLength) {
        _selectionBox.draw(i, _selectionLength, _uiCanvas, jim.rectangle.create(6, 6, _uiCanvas.width - 12, _uiCanvas.height - 12));
    }

    function drawSelection (i, _oldCanvas, _uiCanvas) {
        uiCtx.drawImage(_oldCanvas, 0, 0);
        drawSelectionOutline(i, _uiCanvas, selectionLength);
    }

    function animateSelectionFunction(i, _oldCanvas, _from, _to) {
        function animateSelection() {
            drawSelection(i, _oldCanvas, _uiCanvas);
            if(i < selectionLength) {
                window.requestAnimationFrame(animateSelectionFunction(i + 1, _oldCanvas, _from, _to));
            } else{
                window.requestAnimationFrame(drawFrameFunction(0, _oldCanvas, _from, _to));
            }
        }
        return animateSelection;
    }



    function drawFrameFunction(i, _oldCanvas, _from, _to) {
        function drawFrame() {
            // draw stuff here
            zoomOut(i, _oldCanvas, _uiCanvas, _from, _to);
            if (i < duration){
                window.requestAnimationFrame(drawFrameFunction(i + 1, _oldCanvas, _from, _to));
            } else {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        }
        return drawFrame;
    }

    return {
        play: function (_oldMandelCanvas, _from, _to) {
            // so to zoom out I take the current mset scale it up position it accordingly and then scale in the opposite direction
            window.requestAnimationFrame(animateSelectionFunction(0, _oldMandelCanvas, _from, _to));
        }
    };

};