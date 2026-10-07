import { drawFrames } from "../../animation.js";
import { rectangle } from "../../geometry.js";
import { matchingCanvas } from "../../dom.js";

export function createZoomInAnimation(_uiCanvas, _mandelbrotCanvas, _drawSelection) {

    const width = _mandelbrotCanvas.width, height = _mandelbrotCanvas.height;
    const uiCtx = _uiCanvas.getContext('2d');
    const noOfSteps = 50;
    const noOfSelectionFrames = 40;
    const oldView = matchingCanvas(_uiCanvas);
    const oldCtx = oldView.getContext('2d');


    function positionForStep(_noOfSteps, _currentStep, _start, _growthAmount) {
        const stepSize = _growthAmount / _noOfSteps;
        const increment = stepSize * _currentStep;
        return _start + increment;
    }

    function getMainDrawFunction(_selection, _scaledCtx, _scaledCanvas, _oldView) {
        return function (i) {
            const unSelectedInitialXScale = positionForStep(noOfSteps, i, 1, (width / _selection.area().width()) - 1);
            const unSelectedInitialYScale = positionForStep(noOfSteps, i, 1, (height / _selection.area().height()) - 1);

            const mandelbrotCentreX = width / 2;
            const mandelbrotCentreY = height / 2;

            const selectionCentreX = (_selection.area().x + (_selection.area().width() / 2));
            const selectionCentreY = _selection.area().y + (_selection.area().height() / 2);

            const finalScaleX = width / _selection.area().width();
            const finalScaleY = height / _selection.area().height();

            const finalUnselectedXPos = mandelbrotCentreX - (selectionCentreX * finalScaleX);
            const finalUnselectedYPos = mandelbrotCentreY - (selectionCentreY * finalScaleY);

            const sourceUnselectedXPos = 0;
            const sourceUnselectedYPos = 0;

            const unselectedXPos = positionForStep(noOfSteps, i, sourceUnselectedXPos, finalUnselectedXPos - sourceUnselectedXPos);
            const unselectedYPos = positionForStep(noOfSteps, i, sourceUnselectedYPos, finalUnselectedYPos - sourceUnselectedYPos);

            _scaledCtx.restore();
            uiCtx.drawImage(_scaledCanvas, 0, 0);
            _scaledCtx.save();
            _scaledCtx.setTransform(unSelectedInitialXScale, 0, 0, unSelectedInitialYScale, unselectedXPos, unselectedYPos);
            _scaledCtx.drawImage(_oldView, 0, 0);

            const sourceSelectedX = _selection.area().x;
            const sourceSelectedY = _selection.area().y;

            const targetSelectedX = 0;
            const targetSelectedY = 0;

            const sourceSelectedWidth = _selection.area().width();
            const sourceSelectedHeight = _selection.area().height();

            const targetSelectedWidth = width;
            const targetSelectedHeight = height;

            const currentSelectedWidth = positionForStep(noOfSteps, i, sourceSelectedWidth, targetSelectedWidth - sourceSelectedWidth);
            const currentSelectedHeight = positionForStep(noOfSteps, i, sourceSelectedHeight, targetSelectedHeight - sourceSelectedHeight);

            const selectedAreaCurrentPositionX = positionForStep(noOfSteps, i, sourceSelectedX, targetSelectedX - sourceSelectedX);
            const selectedAreaCurrentPositionY = positionForStep(noOfSteps, i, sourceSelectedY, targetSelectedY - sourceSelectedY);

            uiCtx.drawImage(_mandelbrotCanvas, selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight);
            _drawSelection.draw(1,1,_uiCanvas, rectangle(selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight));

            if (i >= 50) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }

    function getDrawSelectionFunction(_selection, _existingMandelbrot) {

        function drawFullSetTo(uiContext) {
            uiContext.drawImage(_existingMandelbrot, 0,0, _mandelbrotCanvas.width, _mandelbrotCanvas.height);
        }

        function dim(uiContext) {
            uiContext.fillStyle = "rgba(0, 0, 0, 0.5)";
            uiContext.fillRect(0, 0, _uiCanvas.width, _uiCanvas.height);
        }

        function drawSelection(uiContext, _selection) {
            const selX = _selection.area().topLeft().x;
            const selY = _selection.area().topLeft().y;
            const selW = _selection.area().width();
            const selH = _selection.area().height();
            uiContext.drawImage(_existingMandelbrot, selX, selY, selW, selH, selX, selY, selW, selH);
        }

        return function (i) {
            const uiContext = _uiCanvas.getContext('2d');
            drawFullSetTo(uiContext);
            dim(uiContext);
            drawSelection(uiContext, _selection);
            _drawSelection.draw(i, noOfSelectionFrames, _uiCanvas, _selection.area());
            return uiContext;
        };
    }

    function playZoom(_selection, _existingMandelbrot) {
        const scaledCanvas = matchingCanvas(_uiCanvas);
        const scaledCtx = scaledCanvas.getContext('2d');

        oldCtx.drawImage(_mandelbrotCanvas, 0, 0);
        oldCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        oldCtx.fillRect(0, 0, _uiCanvas.width, _uiCanvas.height);
        oldCtx.clearRect(_selection.area().topLeft().x, _selection.area().topLeft().y, _selection.area().width(), _selection.area().height());

        drawFrames(40, getDrawSelectionFunction(_selection, _existingMandelbrot))
            .then(function (uiContext) {
                drawFrames(50, getMainDrawFunction(_selection, scaledCtx, scaledCanvas, oldView));
                return uiContext;
            });
    }

    return {
        play: playZoom
    };
}
