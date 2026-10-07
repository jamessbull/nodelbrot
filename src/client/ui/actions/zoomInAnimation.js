import { drawFrames } from "../../animation.js";
import { rectangle } from "../../geometry.js";
import { matchingCanvas } from "../../dom.js";

export function createZoomInAnimation(uiCanvas, mandelbrotCanvas, selectionDrawer) {

    const width = mandelbrotCanvas.width, height = mandelbrotCanvas.height;
    const uiCtx = uiCanvas.getContext('2d');
    const noOfSteps = 50;
    const noOfSelectionFrames = 40;
    const oldView = matchingCanvas(uiCanvas);
    const oldCtx = oldView.getContext('2d');


    function positionForStep(steps, currentStep, start, growthAmount) {
        const stepSize = growthAmount / steps;
        const increment = stepSize * currentStep;
        return start + increment;
    }

    function getMainDrawFunction(selection, scaledCtx, scaledCanvas, previousView) {
        return function (i) {
            const unSelectedInitialXScale = positionForStep(noOfSteps, i, 1, (width / selection.area().width()) - 1);
            const unSelectedInitialYScale = positionForStep(noOfSteps, i, 1, (height / selection.area().height()) - 1);

            const mandelbrotCentreX = width / 2;
            const mandelbrotCentreY = height / 2;

            const selectionCentreX = (selection.area().x + (selection.area().width() / 2));
            const selectionCentreY = selection.area().y + (selection.area().height() / 2);

            const finalScaleX = width / selection.area().width();
            const finalScaleY = height / selection.area().height();

            const finalUnselectedXPos = mandelbrotCentreX - (selectionCentreX * finalScaleX);
            const finalUnselectedYPos = mandelbrotCentreY - (selectionCentreY * finalScaleY);

            const sourceUnselectedXPos = 0;
            const sourceUnselectedYPos = 0;

            const unselectedXPos = positionForStep(noOfSteps, i, sourceUnselectedXPos, finalUnselectedXPos - sourceUnselectedXPos);
            const unselectedYPos = positionForStep(noOfSteps, i, sourceUnselectedYPos, finalUnselectedYPos - sourceUnselectedYPos);

            scaledCtx.restore();
            uiCtx.drawImage(scaledCanvas, 0, 0);
            scaledCtx.save();
            scaledCtx.setTransform(unSelectedInitialXScale, 0, 0, unSelectedInitialYScale, unselectedXPos, unselectedYPos);
            scaledCtx.drawImage(previousView, 0, 0);

            const sourceSelectedX = selection.area().x;
            const sourceSelectedY = selection.area().y;

            const targetSelectedX = 0;
            const targetSelectedY = 0;

            const sourceSelectedWidth = selection.area().width();
            const sourceSelectedHeight = selection.area().height();

            const targetSelectedWidth = width;
            const targetSelectedHeight = height;

            const currentSelectedWidth = positionForStep(noOfSteps, i, sourceSelectedWidth, targetSelectedWidth - sourceSelectedWidth);
            const currentSelectedHeight = positionForStep(noOfSteps, i, sourceSelectedHeight, targetSelectedHeight - sourceSelectedHeight);

            const selectedAreaCurrentPositionX = positionForStep(noOfSteps, i, sourceSelectedX, targetSelectedX - sourceSelectedX);
            const selectedAreaCurrentPositionY = positionForStep(noOfSteps, i, sourceSelectedY, targetSelectedY - sourceSelectedY);

            uiCtx.drawImage(mandelbrotCanvas, selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight);
            selectionDrawer.draw(1,1,uiCanvas, rectangle(selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight));

            if (i >= 50) {
                uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
            }
        };
    }

    function getDrawSelectionFunction(selection, existingMandelbrot) {

        function drawFullSetTo(uiContext) {
            uiContext.drawImage(existingMandelbrot, 0,0, mandelbrotCanvas.width, mandelbrotCanvas.height);
        }

        function dim(uiContext) {
            uiContext.fillStyle = "rgba(0, 0, 0, 0.5)";
            uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
        }

        // Draws the selected area undimmed.
        function drawSelected(uiContext) {
            const selX = selection.area().topLeft().x;
            const selY = selection.area().topLeft().y;
            const selW = selection.area().width();
            const selH = selection.area().height();
            uiContext.drawImage(existingMandelbrot, selX, selY, selW, selH, selX, selY, selW, selH);
        }

        return function (i) {
            const uiContext = uiCanvas.getContext('2d');
            drawFullSetTo(uiContext);
            dim(uiContext);
            drawSelected(uiContext);
            selectionDrawer.draw(i, noOfSelectionFrames, uiCanvas, selection.area());
            return uiContext;
        };
    }

    function playZoom(selection, existingMandelbrot) {
        const scaledCanvas = matchingCanvas(uiCanvas);
        const scaledCtx = scaledCanvas.getContext('2d');

        oldCtx.drawImage(mandelbrotCanvas, 0, 0);
        oldCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        oldCtx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
        oldCtx.clearRect(selection.area().topLeft().x, selection.area().topLeft().y, selection.area().width(), selection.area().height());

        drawFrames(40, getDrawSelectionFunction(selection, existingMandelbrot))
            .then(function (uiContext) {
                drawFrames(50, getMainDrawFunction(selection, scaledCtx, scaledCanvas, oldView));
                return uiContext;
            });
    }

    return {
        play: playZoom
    };
}
