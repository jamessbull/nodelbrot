namespace("jim.mandelbrot.actions.zoomIn");
jim.mandelbrot.actions.zoomIn.create = function (_uiCanvas, _events, _selection) {
    "use strict";

    var selecting = false;
    var ctx = _uiCanvas.getContext('2d');

    on(_events.beginSelectionAction, function (e) {
        selecting = true;
        _selection.begin(e);
    });

    on(_events.endSelectionAction, function (e) {
        _selection.end(e);
        if (_selection.area().width() > 10) {
            _events.fire(_events.zoomInAction, _selection);
        }
        selecting = false;
        ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
    });

    on(_events.selectionChanged, function (e) {
        if (selecting) {
            _selection.change(e);
            ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            _selection.show(ctx);
        }
    });

    return {};
};