import { matchingCanvas } from "../../dom.js";

export function createZoomIn(_mandelbrotCanvas, _uiCanvas, _events, _selection, _zoomAnim) {
    const on = _events.listenTo;
    let selecting = false;
    const ctx = _uiCanvas.getContext('2d');

    on(_events.selectionStart, function (e) {
        selecting = true;
        _selection.begin(e);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0,0, _uiCanvas.width,_uiCanvas.height);
    });

    on(_events.selectionEnd, function (e) {
        _selection.end(e);
        if (_selection.area().width() > 10) {
            const existingRender = matchingCanvas(_uiCanvas);
            existingRender.getContext('2d').drawImage(_mandelbrotCanvas, 0,0);
            _events.fire(_events.zoomToSelection, _selection);
            _zoomAnim.play(_selection, existingRender);
        }
        selecting = false;
        ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
    });

    on(_events.selectionMove, function (e) {
        if (selecting) {
            _selection.change(e);
            ctx.clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0,0, _uiCanvas.width,_uiCanvas.height);
            _selection.show(ctx);
        }
    });

    return {};
}
