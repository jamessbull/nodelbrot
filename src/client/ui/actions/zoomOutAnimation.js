import { drawFrames } from "../../animation.js";
import { rectangle } from "../../geometry.js";

export function createZoomOutAnimation(uiCanvas, mandelbrotCanvas, selectionBox ) {
    const duration = 60;
    const selectionLength = 30;

    const uiCtx = uiCanvas.getContext('2d');

    function currentPosition(x, currentStep, totalSteps) {
        return ((x / totalSteps) * currentStep);
    }

    function targetDimensions(start, change, currentStep, totalSteps) {
        const x = start.x + currentPosition(change.x, currentStep, totalSteps);
        const y = start.y + currentPosition(change.y, currentStep, totalSteps);
        const w = start.width() + currentPosition(change.width(), currentStep, totalSteps);
        const h = start.height() + currentPosition(change.height(), currentStep, totalSteps);
        return rectangle(x, y, w, h);
    }

    function drawSelectionOutline(i) {
        selectionBox.draw(i, selectionLength, uiCanvas, rectangle(6, 6, uiCanvas.width - 12, uiCanvas.height - 12));
    }

    return {
        // Animates zooming out to the view whose area on the display (in pixels) is outer.
        play: function (oldMandelCanvas, outer) {
            const drawFunc = drawSelectionFun(oldMandelCanvas);
            drawFrames(duration, drawFunc).then(function (result) {
                const screenSize = rectangle(0, 0, uiCanvas.width, uiCanvas.height);
                const currentExpanded = outer;
                const diff = screenSize.difference(currentExpanded);

                const currentShrunk = screenSize.translateFrom(currentExpanded).to(screenSize);
                const oldShrunkDiff = currentShrunk.difference(screenSize);

                const drawZoomOutFrameFunction = drawZoomOutFrame(duration, oldMandelCanvas, diff, currentExpanded, oldShrunkDiff, screenSize);
                drawFrames(duration, drawZoomOutFrameFunction);
            });
        }
    };

    function drawSelectionFun(oldCanvas) {
        return function (i) {
            uiCtx.drawImage(oldCanvas, 0, 0);
            drawSelectionOutline(i);
        };
    }

    function drawZoomOutFrame (frames, oldCanvas, newDiff, newFrom, oldDiff, oldFrom) {
        return function (i) {
            const target = targetDimensions(newFrom, newDiff, i, frames);
            const oldTarget = targetDimensions(oldFrom, oldDiff, i, frames);

            uiCtx.drawImage(mandelbrotCanvas, target.x, target.y, target.width(), target.height());
            uiCtx.drawImage(oldCanvas, oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height());
            selectionBox.draw(1, 1, uiCanvas, rectangle(oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height() - 12));
            if(i>= duration) {
                uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
            }
        };
    }
}
