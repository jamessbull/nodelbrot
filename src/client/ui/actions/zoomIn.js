namespace("jim.mandelbrot.actions.zoomIn");
jim.mandelbrot.actions.zoomIn.create = function (_mandelbrotCanvas, _uiCanvas, _events, _selection, _zoomAnim) {
    "use strict";
    // How do I want this to work now?
    // Click overlay whole screen and set selection to smallest size
    // Clear the selection area so it is bright
    // Show selection animation
    // show zoom animation
    // Make selection snap out in increments

    //What is the best way to show the selection?
    //Selection takes place on UI Canvas
    // so on click I make the whole uiCanvas grey
    // on every move I clear the appropriate part of the uiCanvas

    function newMatchingCanvas(_originalCanvas) {
        var matchingCanvas = document.createElement('canvas');
        matchingCanvas.width = _originalCanvas.width;
        matchingCanvas.height = _originalCanvas.height;
        return matchingCanvas;
    }

    var selecting = false;
    var ctx = _uiCanvas.getContext('2d');

    on(_events.beginSelectionAction, function (e) {
        selecting = true;
        _selection.begin(e);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0,0, _uiCanvas.width,_uiCanvas.height);
    });

    on(_events.endSelectionAction, function (e) {
        _selection.end(e);
        if (_selection.area().width() > 10) {
            var existingRender = newMatchingCanvas(_uiCanvas);
            existingRender.getContext('2d').drawImage(_mandelbrotCanvas, 0,0);
            _events.fire(_events.zoomInAction, _selection);
            _zoomAnim.play(_selection, existingRender);
        }
        selecting = false;
        ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
    });

    on(_events.selectionChanged, function (e) {
        if (selecting) {
            _selection.change(e);
            ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0,0, _uiCanvas.width,_uiCanvas.height);
            _selection.show(ctx);
        }
    });

    return {};
};