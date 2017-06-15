
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
                var screenSize = jim.rectangle.create(0, 0, _uiCanvas.width, _uiCanvas.height);
                var currentExpanded = _to.translateFrom(_from).to(screenSize);
                var diff = screenSize.difference(currentExpanded);

                var currentShrunk = screenSize.translateFrom(currentExpanded).to(screenSize);
                var oldShrunkDiff = currentShrunk.difference(screenSize);


                var drawZoomOutFrameFunction = drawZoomOutFrame(_oldCanvas, diff, currentExpanded, oldShrunkDiff, screenSize);
                anim.drawFrames(duration, drawZoomOutFrameFunction);
                //window.requestAnimationFrame(drawFrameFunction(0, _oldCanvas, diff, currentExpanded, oldShrunkDiff, screenSize));
            }
        }
        return animateSelection;
    }

    return {
        play: function (_oldMandelCanvas, _from, _to) {
            // so to zoom out I take the current mset scale it up position it accordingly and then scale in the opposite direction
            window.requestAnimationFrame(animateSelectionFunction(0, _oldMandelCanvas, _from, _to));
        }
    };

    function drawZoomOutFrame (_oldCanvas, _newDiff, _newFrom, _oldDiff, _oldFrom) {
        return function (i) {
            var target = targetDimensions(_newFrom, _newDiff, i, duration);
            var oldTarget = targetDimensions(_oldFrom, _oldDiff, i, duration);

            uiCtx.drawImage(_mandelbrotCanvas, target.x, target.y, target.width(), target.height());
            uiCtx.drawImage(_oldCanvas, oldTarget.x, oldTarget.y, oldTarget.width(), oldTarget.height());
            if(i>= duration) {
                uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            }
        };
    }

};


// would be nice to have a way of splitting up the two different anims so I can say do this then this
// like a promise?
// so first(drawFrameOne).then(drawFrameTwo).then()   etc
//var sequence
// for () {
//    sequence.add(drawFrame(i))
// }
// sequence.resolve()