
namespace("jim.mandelbrot.ui.actions.zoomOutAnimation");
jim.mandelbrot.ui.actions.zoomOutAnimation.create = function (_uiCanvas, _mandelbrotCanvas, _selectionBox ) {
    "use strict";
    var anim = jim.anim.fixedLength.create();
    var duration = 60;
    var selectionLength = 30;

    var uiCtx = _uiCanvas.getContext('2d');

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

    function drawSelectionOutline(i, _uiCanvas, _selectionLength) {
        _selectionBox.draw(i, _selectionLength, _uiCanvas, jim.rectangle.create(6, 6, _uiCanvas.width - 12, _uiCanvas.height - 12));
    }

    return {
        play: function (_oldMandelCanvas, _from, _to) {
            var drawFunc = drawSelectionFun(_oldMandelCanvas, _uiCanvas);
            anim.drawFrames(duration, drawFunc).then(function (result) {
                var screenSize = jim.rectangle.create(0, 0, _uiCanvas.width, _uiCanvas.height);
                var currentExpanded = _to.translateFrom(_from).to(screenSize);
                var diff = screenSize.difference(currentExpanded);

                var currentShrunk = screenSize.translateFrom(currentExpanded).to(screenSize);
                var oldShrunkDiff = currentShrunk.difference(screenSize);

                var drawZoomOutFrameFunction = drawZoomOutFrame(duration, _oldMandelCanvas, diff, currentExpanded, oldShrunkDiff, screenSize);
                anim.drawFrames(duration, drawZoomOutFrameFunction);
            }).then(function (result2) {
            });
        }
    };

    function drawSelectionFun (_oldCanvas, _uiCanvas) {
        return function (i) {
            uiCtx.drawImage(_oldCanvas, 0, 0);
            drawSelectionOutline(i, _uiCanvas, selectionLength);
        };
    }

    function drawZoomOutFrame (_duration, _oldCanvas, _newDiff, _newFrom, _oldDiff, _oldFrom) {
        return function (i) {
            var target = targetDimensions(_newFrom, _newDiff, i, _duration);
            var oldTarget = targetDimensions(_oldFrom, _oldDiff, i, _duration);

            uiCtx.drawImage(_mandelbrotCanvas, target.x, target.y, target.width(), target.height());
            uiCtx.drawImage(_oldCanvas, oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height());
            _selectionBox.draw(1, 1, _uiCanvas, jim.rectangle.create(oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height() - 12));
            if(i>= duration) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }
};