namespace("jim.dom.functions");
jim.dom.functions.create = function () {
    "use strict";
    var buttonSelectedClass = "buttonSelected";

    var addClass = function (_element, _className) {
        _element.className = _element.className + " " + _className;
    };

    var removeClass = function (_element, _className) {
        _element.classList.remove(_className);
    };

    var selectButton = function (_button) {
        addClass(_button, buttonSelectedClass);
    };

    var deselectButton = function (button) {
        removeClass(button, buttonSelectedClass);
    };

    var hide = function (e) {
        e.style.display="none";
    };

    var show = function (e) {
        e.style.display = "";
    };

    return {
        addClass: addClass,
        removeClass: removeClass,
        selectButton: selectButton,
        deselectButton: deselectButton,
        hide: hide,
        show: show
    };
};

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
jim.mandelbrot.ui.elements.create = function (_exportDimensions, _mandelbrotSet, _deadRegionsCanvas, _events) {
    "use strict";
    var dom = jim.dom.functions.create();

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

    examineMenuButton.onclick = function () {
        dom.selectButton(examineMenuButton);
        dom.deselectButton(exportMenuButton);
        dom.show(examinePixelsPanel);
        dom.hide(exportPanel);
    };

    exportMenuButton.onclick = function () {
        dom.selectButton(exportMenuButton);
        dom.deselectButton(examineMenuButton);
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


    var updateDeadRegions = function (black) {
        var context = _deadRegionsCanvas.getContext('2d');
        var radius = ignoreDeadPixelsRadius.value;
        var deadRegions = _mandelbrotSet.state().deadRegions(radius);
        context.fillStyle = "rgba(255, " + 255 + ", 255, 0.6)";

        if (black) {
            context.clearRect(0,0, _deadRegionsCanvas.width, _deadRegionsCanvas.height);
        } else {
            for (var y = 0; y < 400; y+=1) {
                for (var x = 0 ; x < 700; x += 1) {
                    if(deadRegions[y * 700 + x]) {
                        context.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    };

    var killDeadRegionDisplay = function () {
        ignoreDeadPixelsCheckbox.checked = false;
        updateDeadRegions(true);
    };

    _events.listenTo("zoomIn", function () { killDeadRegionDisplay(); });
    _events.listenTo("zoomOut", function () { killDeadRegionDisplay(); });
    _events.listenTo("moved", function () { killDeadRegionDisplay(); });

    ignoreDeadPixelsCheckbox.onclick= function () {
        ignoreChecked = !ignoreChecked;
        ignoreDeadPixelsCheckbox.checked = ignoreChecked;
        updateDeadRegions(!ignoreChecked);
    };

    var parallelHistogram = jim.parallelHistogramGenerator.create();
    jim.mandelbrot.image.exporter.create(_exportDimensions, _mandelbrotSet, parallelHistogram, dom);
    //var histogramDisplay = jim.mandelbrot.ui.histogram.create(parallelHistogram, _mandelbrotSet, dom);
};
