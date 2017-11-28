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

    function getMainDrawFunction(_selection, _scaledCtx, _scaledCanvas, _oldView) {
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

            _scaledCtx.restore();
            uiCtx.drawImage(_scaledCanvas, 0, 0);
            _scaledCtx.save();
            _scaledCtx.setTransform(unSelectedInitialXScale, 0, 0, unSelectedInitialYScale, unselectedXPos, unselectedYPos);
            _scaledCtx.drawImage(_oldView, 0, 0);

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
            _drawSelection.draw(1,1,_uiCanvas, jim.rectangle.create(selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight));

            if (i >= 50) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }

    function getDrawSelectionFunction(_selection, _existingMandelbrot) {

        function drawFullSetTo(uiContext) {
            uiContext.drawImage(_existingMandelbrot, 0,0, mandelbrotCanvas.width, mandelbrotCanvas.height);
        }

        function dim(uiContext) {
            uiContext.fillStyle = "rgba(0, 0, 0, 0.5)";
            uiContext.fillRect(0, 0, _uiCanvas.width, _uiCanvas.height);
        }

        function drawSelection(uiContext, _selection) {
            var selX = _selection.area().topLeft().x;
            var selY = _selection.area().topLeft().y;
            var selW = _selection.area().width();
            var selH = _selection.area().height();
            uiContext.drawImage(_existingMandelbrot, selX, selY, selW, selH, selX, selY, selW, selH);
        }

        return function (i) {
            var uiContext = _uiCanvas.getContext('2d');
            drawFullSetTo(uiContext);
            dim(uiContext);
            drawSelection(uiContext, _selection);
            _drawSelection.draw(i, noOfSelectionFrames, _uiCanvas, _selection.area());
            return uiContext;
        };
    }

    function playZoom(_selection, _existingMandelbrot) {
        var scaledCanvas = newMatchingCanvas(_uiCanvas);
        var scaledCtx = scaledCanvas.getContext('2d');

        oldCtx.drawImage(_mandelbrotCanvas, 0, 0);
        oldCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        oldCtx.fillRect(0, 0, _uiCanvas.width, _uiCanvas.height);
        oldCtx.clearRect(_selection.area().topLeft().x, _selection.area().topLeft().y, _selection.area().width(), _selection.area().height());

        anim.drawFrames(40, getDrawSelectionFunction(_selection, _existingMandelbrot))
            .then(function (uiContext) {
                anim.drawFrames(50, getMainDrawFunction(_selection, scaledCtx, scaledCanvas, oldView));
                return uiContext;
            });
    }

    return {
        play: playZoom
    };
};