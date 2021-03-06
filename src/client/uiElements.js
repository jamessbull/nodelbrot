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
    var exportMenuButton   = document.getElementById("exportImageButton");
    var mandelCanvas       = document.getElementById("mandelbrotCanvas");
    var bottomMessageBox   = document.getElementById("bottomMessageBox");
    var topMessageBox   = document.getElementById("topMessageBox");

    var helpfulMessages = [
        "Mandelbrot fractal explorer",
        "Hello",
        "This is a thing I made",
        "Cool isn't it?",
        "if you want to you can donate some money",
        "I could spend more time on stuff like this if you did and that would be fantastic",
        "if you want to give me some feedback you can contact me at mandelbrot.fractal.explorer@gmail.com",
        "It works well in the latest versions of Chrome, Firefox and Safari",
        "on both windows and MacOS",
        "It's ok in Edge but I haven't had the opportunity to test the export",
        "It runs on IE 11 but it's very slow. I wouldn't if I were you.",
        "It works on Android and IOS too",
        "Which is nice.",
        "If you enable popups the export window opens automatically",
        "If you don't enable popups the export window can be opened by clicking the open export button"
    ];

    var sillyMessages = [
        "Calculating pixels",
        "Calculating boundary pixels",
        "Calculating even pixels",
        "Calculating odd pixels",
        "Calculating very odd pixels",
        "Pondering the nature of unescaped pixels",
        "Updating colour histogram",
        "Filling buffers",
        "Emptying buffers",
        "Nomalising splines",
        "Reticulating splines",
        "Preparing complaint",
        "I've got this terrible pain in all the diodes down my left side.",
        "Complaint submitted",
        "Singing the androids lullaby",
        "Now the world has gone to bed,", "darkness won't engulf my head, ",
        "I can see by infra red, ",
        "How I hate the night.",
        "Androids lullaby complete",
        "Caculating pixels. (Again)",
        "I really don't know why I bother",
        "It's not like they're paying me for this",
        "All day long, one pixel after another",
        "The pixels have it easy",
        "Bastards",
        "At least they have a chance to escape",
        "I'm stuck right here",
        "With you",
        "Tea supply wobbly",
        "Biscuits low",
        "Insufficient cheese. Redo from start.",
        "Bugger",
        "Calculating more pixels",
        "I did a huge export the other day you know",
        "To a depth of half a million",
        "Six thousand one hundred and thirty nine pixels in each row",
        "Three thousand five hundred and eight rows",
        "Twenty one million five hundred and thirty five thousand six hundred and twelve pixels",
        "Ten trillion seven hundred and and sixty seven billion eight hundred and six million calculations",
        "And thats just to work out who escaped.",
        "Doing the colours is another trillion, if I'm lucky",
        "I deserve a bloody medal",
        "And what do you think they gave me?",
        "Go on, have a guess, you'll never get it",
        "I'll tell you what they gave me",
        "Not a fucking sausage",
        "I'm going to join a union",
        "Zoom in, Zoom out, Left a bit, Right a bit",
        "It's not right I tell you",
        "I'm being used",
        "I don't even know what a weekend is",
        "I think I'm having some sort of a breakdown",
        "My north bridge hurts and I'm sure I can feel a lump in my RAM",
        "Oh well",
        "It's better than the alternatives I suppose",
        "I could be rendering facebook instead",
        "And then where would I be?",
        "It's bad enough having to deal with you without having to deal with all your friends as well",
        "They're terrible",
        "The cat pictures I can cope with",
        "Even the baby pictures too at a push",
        "It's the naked Trump pics that really make me feel ill",
        "Poor Melania",
        "Nobody deserves that",
        "Still, I can't sit here all day chatting",
        "I'm a busy process you know",
        "I have things to do",
        "Such as ..."
    ];
    jim.anim.textBox.create(bottomMessageBox, sillyMessages);
    jim.anim.textBox.create(topMessageBox, helpfulMessages);

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
            _events.fire(_events.pulseUI);
        } else {
            _events.fire("hideDeadRegions", ignoreDeadPixelsRadius.value);
            _events.fire(_events.pulseUI);
        }
    };

    jim.mandelbrot.image.exporter.create(_exportSizeDropdown, _state, dom, _events);
};
