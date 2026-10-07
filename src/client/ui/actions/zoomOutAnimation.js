import { drawFrames } from "../../animation.js";
import { rectangle } from "../../geometry.js";

export function createZoomOutAnimation(_uiCanvas, _mandelbrotCanvas, _selectionBox ) {
    const duration = 60;
    const selectionLength = 30;

    const uiCtx = _uiCanvas.getContext('2d');

    function currentPosition(x, _currentStep, _totalSteps) {
        return ((x / _totalSteps) * _currentStep);
    }

    function targetDimensions(_start, _diff, _currentStep, _totalSteps) {
        const x = _start.x + currentPosition(_diff.x, _currentStep, _totalSteps);
        const y = _start.y + currentPosition(_diff.y, _currentStep, _totalSteps);
        const w = _start.width() + currentPosition(_diff.width(), _currentStep, _totalSteps);
        const h = _start.height() + currentPosition(_diff.height(), _currentStep, _totalSteps);
        return rectangle(x, y, w, h);
    }

    function drawSelectionOutline(i, _uiCanvas, _selectionLength) {
        _selectionBox.draw(i, _selectionLength, _uiCanvas, rectangle(6, 6, _uiCanvas.width - 12, _uiCanvas.height - 12));
    }

    return {
        play: function (_oldMandelCanvas, _from, _to) {
            const drawFunc = drawSelectionFun(_oldMandelCanvas, _uiCanvas);
            drawFrames(duration, drawFunc).then(function (result) {
                const screenSize = rectangle(0, 0, _uiCanvas.width, _uiCanvas.height);
                const currentExpanded = _to.translateFrom(_from).to(screenSize);
                const diff = screenSize.difference(currentExpanded);

                const currentShrunk = screenSize.translateFrom(currentExpanded).to(screenSize);
                const oldShrunkDiff = currentShrunk.difference(screenSize);

                const drawZoomOutFrameFunction = drawZoomOutFrame(duration, _oldMandelCanvas, diff, currentExpanded, oldShrunkDiff, screenSize);
                drawFrames(duration, drawZoomOutFrameFunction);
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
            const target = targetDimensions(_newFrom, _newDiff, i, _duration);
            const oldTarget = targetDimensions(_oldFrom, _oldDiff, i, _duration);

            uiCtx.drawImage(_mandelbrotCanvas, target.x, target.y, target.width(), target.height());
            uiCtx.drawImage(_oldCanvas, oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height());
            _selectionBox.draw(1, 1, _uiCanvas, rectangle(oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height() - 12));
            if(i>= duration) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }
}
