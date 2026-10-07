namespace("jim.mandelbrot.ui.elements");
jim.mandelbrot.ui.elements.create = function (_exportSizeDropdown, _state, _events) {
    "use strict";
    var dom = jim.dom.functions.create();
    var on = _events.listenTo;

    var stopButton         = document.getElementById("stop");
    var startButton        = document.getElementById("start");

    dom.selectButton(startButton);

    on(_events.start, function () {
        dom.selectButton(startButton);
        dom.deselectButton(stopButton);
    });

    on(_events.restart, function () {
        dom.selectButton(startButton);
        dom.deselectButton(stopButton);
    });

    on(_events.stop, function () {
        dom.selectButton(stopButton);
        dom.deselectButton(startButton);
    });

    startButton.onclick = function () {
        _events.fire(_events.start);
    };

    stopButton.onclick = function () {
        _events.fire(_events.stop);
    };

    var examineMenuButton  = document.getElementById("pixelInfoButton");
    var examinePixelsPanel = document.getElementById("examinePixels");
    var exportPanel        = document.getElementById("exportImagePanel");
    var mandelCanvas       = document.getElementById("mandelbrotCanvas");

    examineMenuButton.onclick = function () {
        if (examineMenuButton.classList.contains("buttonSelected")) {
            dom.deselectButton(examineMenuButton);
            dom.removeClass(mandelCanvas, "magnifyCursor");
            _events.fire(_events.stopExaminingPixelState);

        } else{
            dom.selectButton(examineMenuButton);
            dom.addClass(mandelCanvas, "magnifyCursor");
            _events.fire(_events.stop);
            _events.fire(_events.examinePixelState);
        }
    };

    dom.show(exportPanel);
    dom.deselectButton(examineMenuButton);
    dom.show(examinePixelsPanel);

    jim.mandelbrot.image.exporter.create(_exportSizeDropdown, _state, dom, _events);
};
