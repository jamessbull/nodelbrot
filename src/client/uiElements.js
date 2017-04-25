namespace("jim.mandelbrot.ui.histogram");
jim.mandelbrot.ui.histogram.create = function (_parallelHistogram, _mandelbrotSet, _dom) {
    "use strict";
    var histogramButton = document.getElementById("showHistogramButton");
    var histogramCanvas = document.getElementById("histogramCanvas");
    _dom.hide(histogramCanvas);
    var interpolate = jim.interpolator.create().interpolate;
    var context = histogramCanvas.getContext('2d');

    var drawLine = function (fromX, fromY, toX, toY) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(30,255,30,255)';
        context.stroke();
    };
    context.strokeStyle = 'rgba(0,255,0,255)';
    context.fillStyle = 'rgba(0,0,0,255)';
    context.fillRect(0,0,700,400);

    var drawHistogram = function (e) {
        context.clearRect(0,0, 700, 400);
        var histogram = jim.twoPhaseHistogram.create(e.histogramData.length);
        histogram.setData(e.histogramData, e.histogramTotal);
        histogram.process();
        for (var i = 0; i < 700; i++) {
            var index = Math.floor(interpolate(0, e.histogramData.length, i / 700));
            drawLine(i, 400, i, 400 - histogram.percentEscapedBy(index) * 400);
        }
    };

    events.listenTo("histogramViewComplete", drawHistogram);
    var showing = false;


    histogramButton.onclick  = function () {
        if (showing) {
            _dom.hide(histogramCanvas);
            showing = false;
        } else {
            _dom.show(histogramCanvas);
            showing = true;
        }

        _parallelHistogram.run(_mandelbrotSet.state().getExtents(),1000, 140, 80, "histogramViewComplete", "histoProgress", 10);
    };

};

namespace("jim.mandelbrot.ui.elements");
jim.mandelbrot.ui.elements.create = function (_exportSizeDropdown, _mandelbrotSet, _deadRegionsCanvas, _events) {
    "use strict";
    var dom = jim.dom.functions.create();
    var on = _events.listenTo;

    var stopButton         = document.getElementById("stop");
    var startButton        = document.getElementById("start");

    dom.selectButton(startButton);

    startButton.onclick = function () {
        dom.selectButton(startButton);
        dom.deselectButton(stopButton);
        _mandelbrotSet.go();
    };

    stopButton.onclick = function () {
        dom.selectButton(stopButton);
        dom.deselectButton(startButton);
        _mandelbrotSet.stop();
    };

    var examineMenuButton  = document.getElementById("pixelInfoButton");
    var examinePixelsPanel = document.getElementById("examinePixels");
    var exportPanel        = document.getElementById("exportImagePanel");
    var exportMenuButton   = document.getElementById("exportImageButton");
    var mandelCanvas   = document.getElementById("mandelbrotCanvas");


    examineMenuButton.onclick = function () {
        if (examineMenuButton.classList.contains("iconSelected")) {
            dom.deselectIcon(examineMenuButton);
            dom.hide(examinePixelsPanel);
            dom.removeClass(mandelCanvas, "magnifyCursor");
            _mandelbrotSet.go();

        } else{
            dom.selectIcon(examineMenuButton);
            dom.deselectButton(exportMenuButton);
            dom.show(examinePixelsPanel);
            dom.addClass(mandelCanvas, "magnifyCursor");
            dom.hide(exportPanel); //element.style.cursor
            _mandelbrotSet.stop();
            _events.fire(_events.examinePixelState);
        }
    };

    exportMenuButton.onclick = function () {
        dom.selectButton(exportMenuButton);
        dom.removeClass(_mandelbrotSet.canvas(), "magnifyCursor");
        dom.deselectIcon(examineMenuButton);
        dom.show(exportPanel);
        dom.hide(examinePixelsPanel);
    };

    dom.selectButton(exportMenuButton);
    dom.show(exportPanel);
    dom.deselectButton(examineMenuButton);
    dom.hide(examinePixelsPanel);

    var ignoreDeadPixelsCheckbox = document.getElementById("ignoreDeadPixels");
    var ignoreDeadPixelsRadius = document.getElementById("ignoreDeadPixelsRadius");
    var ignoreChecked = false;
    ignoreDeadPixelsCheckbox.checked = false;

    on(_events.extentsUpdate, function () {
        ignoreDeadPixelsCheckbox.checked = false;
        ignoreChecked = false;
    });

    ignoreDeadPixelsCheckbox.onclick= function () {
        ignoreChecked = !ignoreChecked;
        ignoreDeadPixelsCheckbox.checked = ignoreChecked;
        if (ignoreChecked) {
            _events.fire("showDeadRegions", ignoreDeadPixelsRadius.value);
        } else {
            _events.fire("hideDeadRegions", ignoreDeadPixelsRadius.value);
        }
    };

    var parallelHistogram = jim.parallelHistogramGenerator.create();
    jim.mandelbrot.image.exporter.create(_exportSizeDropdown, _mandelbrotSet, parallelHistogram, dom, _events);
    //var histogramDisplay = jim.mandelbrot.ui.histogram.create(parallelHistogram, _mandelbrotSet, dom);
};
