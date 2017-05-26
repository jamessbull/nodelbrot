namespace("jim.mandelbrot.ui.actions.zoomInAnimation");
jim.mandelbrot.ui.actions.zoomInAnimation.create = function (_uiCanvas, _mandelbrotCanvas ) {
    "use strict";

    var width = _mandelbrotCanvas.width, height = _mandelbrotCanvas.height;
    var uiCtx = _uiCanvas.getContext('2d');
    var noOfSteps = 50;
    var oldView = newMatchingCanvas(_uiCanvas);


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

    function playZoomAnimation(_selection, _existingMandelbrot) {

        var oldCtx = oldView.getContext('2d');
        var scaledCanvas = newMatchingCanvas(_uiCanvas);
        var scaledCtx = scaledCanvas.getContext('2d');
        oldCtx.drawImage(_mandelbrotCanvas, 0,0);
        drawSelection(1,1, oldView);
         function drawFun(i) {
             return function () {
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

                 scaledCtx.save();
                 scaledCtx.setTransform(unSelectedInitialXScale, 0, 0, unSelectedInitialYScale,  unselectedXPos ,  unselectedYPos );
                 scaledCtx.drawImage(oldView,0,0);

                 scaledCtx.restore();
                 uiCtx.drawImage(scaledCanvas, 0, 0);

                 var sourceSelectedX = _selection.area().x;
                 var sourceSelectedY = _selection.area().y;

                 var targetSelectedX = 0;
                 var targetSelectedY = 0;

                 var sourceSelectedWidth = _selection.area().width();
                 var sourceSelectedHeight = _selection.area().height();

                 var targetSelectedWidth = width;
                 var targetSelectedHeight = height;

                 var currentSelectedWidth = positionForStep(noOfSteps, i, sourceSelectedWidth, targetSelectedWidth - sourceSelectedWidth);
                 var currentSelectedHeight = positionForStep(noOfSteps,i, sourceSelectedHeight, targetSelectedHeight - sourceSelectedHeight);

                 var selectedAreaCurrentPositionX = positionForStep(noOfSteps, i, sourceSelectedX, targetSelectedX -sourceSelectedX);
                 var selectedAreaCurrentPositionY = positionForStep(noOfSteps, i, sourceSelectedY, targetSelectedY - sourceSelectedY);

                 uiCtx.drawImage(_mandelbrotCanvas, selectedAreaCurrentPositionX, selectedAreaCurrentPositionY, currentSelectedWidth, currentSelectedHeight);

                 if(i < (noOfSteps)) {
                     window.requestAnimationFrame(drawFun(i + 1));
                 } else {
                     uiCtx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
                 }
             };
         }

        function drawPath(_colour, _start, _destination, _canvas) {
            _canvas.getContext('2d').fillStyle = _colour;
            var x = _start.x;
            var y = _start.y;
            var width = _destination.x - (x - 1);
            var height = _destination.y - (y - 1);
            if(height === 0) height = 1;
            if(width === 0) width = 1;
            _canvas.getContext('2d').fillRect(x, y, width, height);
        }

        function drawLine(_line, _canvas) {
            var colours = ['black','gray','white', 'white', 'gray','black'];
            for ( var offset = 0 ; offset < 6; offset +=1) {

                var destination = {x:0, y:0};
                var location = {x: 0, y: 0};
                if (_line.direction === "right") {
                    location.x = _line.location.x - offset;
                    location.y = _line.location.y - offset;
                    destination.x = (_line.location.x + _line.length) + offset;
                    destination.y = _line.location.y - offset;
                }
                if (_line.direction === "down") {
                    location.x = _line.location.x + offset;
                    location.y = _line.location.y - offset;
                    destination.x = _line.location.x + offset;
                    destination.y = _line.location.y + _line.length + offset;
                }
                if (_line.direction === "left") {
                    location.x = _line.location.x - _line.length - offset;
                    location.y = _line.location.y +offset;
                    destination.x = _line.location.x + offset;
                    destination.y = _line.location.y + offset;
                }
                if (_line.direction === "up") {
                    location.x = _line.location.x - offset;
                    location.y = _line.location.y + offset;
                    destination.x = _line.location.x - offset;
                    destination.y = _line.location.y - _line.length - offset;
                }
                drawPath(colours[offset], location, destination, _canvas);
            }
        }

        function line(_location, _length, _direction, _colour) {
            return {
                direction:_direction,
                length:_length,
                location: _location,
                colour: _colour
            };
        }

        function drawSelection (i, total, _canvas) {
            var intermediate = newMatchingCanvas(_canvas);

            var interctx = intermediate.getContext('2d');
            interctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            interctx.fillRect(0,0, _canvas.width,_canvas.height);
            interctx.clearRect(_selection.area().topLeft().x, _selection.area().topLeft().y, _selection.area().width(), _selection.area().height() );
            // interctx.fillStyle = "rgba(0, 0, 0, 0.0)";

            _canvas.getContext('2d').drawImage(_existingMandelbrot, 0,0);
            _canvas.getContext('2d').drawImage(intermediate, 0, 0);

            var lines = [
                line({x: _selection.area().x , y: _selection.area().y }, _selection.area().width(), "right", 'white'),
                line({x:_selection.area().topRight().x, y: _selection.area().topRight().y}, _selection.area().height(), "down", 'white'),
                line({x:_selection.area().bottomRight().x , y: _selection.area().bottomRight().y}, _selection.area().width(), "left", 'white'),
                line({x: _selection.area().bottomLeft().x , y: _selection.area().bottomLeft().y }, _selection.area().height(), "up", 'white')
            ];

            var totalLength = (_selection.area().width() + _selection.area().height()) * 2;
            var percentThrough = i / total;
            var remainingLength = totalLength * percentThrough;

            lines.forEach(function (line) {
                if(Math.abs(line.length) <= remainingLength) {
                    remainingLength -= Math.abs(line.length);
                } else {
                    line.length = remainingLength;
                    remainingLength = 0;
                }
                if (line.length !== 0) {
                    drawLine(line, _canvas);
                }
            });
        }

        function callback (i) {
            var noOfSelectionFrames = 40;

            return function () {
                if (i < noOfSelectionFrames) {
                    drawSelection(i, noOfSelectionFrames, _uiCanvas);
                    window.requestAnimationFrame(callback( i+1));
                } else {
                    window.requestAnimationFrame(drawFun(0));
                }
            };
        }

        window.requestAnimationFrame(callback(0));

    }
    return {
        play: playZoomAnimation
    };
};