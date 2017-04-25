namespace("jim.mandelbrot.examinePixelStateDisplay");
jim.mandelbrot.examinePixelStateDisplay.create = function (_events, _imgData) {
    "use strict";
    on(_events.publishPixelState, function (data) {
       console.log("pixel state published");
       console.log("hello ");
    });
};