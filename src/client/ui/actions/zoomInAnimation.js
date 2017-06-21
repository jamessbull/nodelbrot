namespace("jim.mandelbrot.ui.actions.zoomInAnimation");
jim.mandelbrot.ui.actions.zoomInAnimation.create = function (_uiCanvas, _mandelbrotCanvas, _drawSelection) {
    "use strict";
    var anim = jim.anim.fixedLength.create();

    var width = _mandelbrotCanvas.width, height = _mandelbrotCanvas.height;
    var uiCtx = _uiCanvas.getContext('2d');
    var noOfSteps = 50;
    var noOfSelectionFrames = 40;
    var oldView = newMatchingCanvas(_uiCanvas);
    var oldCtx = oldView.getContext('2d');


    function newMatchingCanvas(_originalCanvas) {
        var matchingCanvas = document.createElement('canvas');
        matchingCanvas.width = _originalCanvas.width;
        matchingCanvas.height = _originalCanvas.height;
        return matchingCanvas;
    }

    function positionForStep(_noOfSteps, _currentStep, _start, _growthAmount) {
        var stepSize = _growthAmount / _noOfSteps;
        var increment = stepSize * _currentStep;
        return _start + increment;
    }

    function getMainDrawFunction(_selection, _scaledCtx, _scaledCanvas) {
        return function (i) {
            var unSelectedInitialXScale = positionForStep(noOfSteps, i, 1, (width / _selection.area().width()) - 1);
            var unSelectedInitialYScale = positionForStep(noOfSteps, i, 1, (height / _selection.area().height()) - 1);

            var mandelbrotCentreX = width / 2;
            var mandelbrotCentreY = height / 2;

            var selectionCentreX = (_selection.area().x + (_selection.area().width() / 2));
            var selectionCentreY = _selection.area().y + (_selection.area().height() / 2);

            var finalScaleX = width / _selection.area().width();
            var finalScaleY = height / _selection.area().height();

            var finalUnselectedXPos = mandelbrotCentreX - (selectionCentreX * finalScaleX);
            var finalUnselectedYPos = mandelbrotCentreY - (selectionCentreY * finalScaleY);

            var sourceUnselectedXPos = 0;
            var sourceUnselectedYPos = 0;

            var unselectedXPos = positionForStep(noOfSteps, i, sourceUnselectedXPos, finalUnselectedXPos - sourceUnselectedXPos);
            var unselectedYPos = positionForStep(noOfSteps, i, sourceUnselectedYPos, finalUnselectedYPos - sourceUnselectedYPos);

            _scaledCtx.save();
            _scaledCtx.setTransform(unSelectedInitialXScale, 0, 0, unSelectedInitialYScale, unselectedXPos, unselectedYPos);
            _scaledCtx.drawImage(oldView, 0, 0);

            _scaledCtx.restore();
            uiCtx.drawImage(_scaledCanvas, 0, 0);

            var sourceSelectedX = _selection.area().x;
            var sourceSelectedY = _selection.area().y;

            var targetSelectedX = 0;
            var targetSelectedY = 0;

            var sourceSelectedWidth = _selection.area().width();
            var sourceSelectedHeight = _selection.area().height();

            var targetSelectedWidth = width;
            var targetSelectedHeight = height;

            var currentSelectedWidth = positionForStep(noOfSteps, i, sourceSelectedWidth, targetSelectedWidth - sourceSelectedWidth);
            var currentSelectedHeight = positionForStep(noOfSteps, i, sourceSelectedHeight, targetSelectedHeight - sourceSelectedHeight);

            var selectedAreaCurrentPositionX = positionForStep(noOfSteps, i, sourceSelectedX, targetSelectedX - sourceSelectedX);
            var selectedAreaCurrentPositionY = positionForStep(noOfSteps, i, sourceSelectedY, targetSelectedY - sourceSelectedY);

            uiCtx.drawImage(_mandelbrotCanvas, selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight);
            if (i >= 50) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }

    function getDrawSelectionFunction(_selection, _existingMandelbrot) {
        return function (i) {
            var intermediate = newMatchingCanvas(_uiCanvas);
            var interctx = intermediate.getContext('2d');
            interctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            interctx.fillRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            interctx.clearRect(_selection.area().topLeft().x, _selection.area().topLeft().y, _selection.area().width(), _selection.area().height());

            var uiContext = _uiCanvas.getContext('2d');
            uiContext.drawImage(_existingMandelbrot, 0, 0);
            uiContext.drawImage(intermediate, 0, 0);

            _drawSelection.draw(i, noOfSelectionFrames, _uiCanvas, _selection.area());
            return uiContext;
        };
    }

    function playZoom(_selection, _existingMandelbrot) {
        var scaledCanvas = newMatchingCanvas(_uiCanvas);
        var scaledCtx = scaledCanvas.getContext('2d');
        oldCtx.drawImage(_mandelbrotCanvas, 0, 0);
        _drawSelection.draw(1, 1, oldView, _selection.area());
        anim.drawFrames(40, getDrawSelectionFunction(_selection, _existingMandelbrot))
            .then(function (uiContext) {
                anim.drawFrames(50, getMainDrawFunction(_selection, scaledCtx, scaledCanvas));
                return uiContext;
            });
    }

    return {
        play: playZoom
    };
};