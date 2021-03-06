var total = function (arr) {
    "use strict";
    var arrResult = [];
    arr.forEach(function (e, i) {
        if (i === 0) {
            arrResult[i] = e;
        } else {
             arrResult[i] = arrResult[i - 1] + e;
        }
    });
    return arrResult;
};

var namespace = function (name) {
    "use strict";
    var parts = name.split("."), partial = self;
    parts.forEach(function (part) {
        if (partial[part] === undefined) {
            partial[part] = {};
        }
        partial = partial[part];
    });
};

namespace("jim.common.array");
jim.common.array = function (x, f) {
    "use strict";
    var a = [];
    for (var i = 0 ; i < x; i += 1) {
        a[i] = f(i);
    }
    return a;
};

namespace("jim.worker.pool");
jim.worker.pool.create = function (noOfWorkers, workerUrl, initialJobs, toTransfer, _nameOfStandardTransferList) {
    "use strict";
    function array(x, f) {
        var a = [];
        for (var i = 0 ; i < x; i += 1) {
            a[i] = f(i);
        }
        return a;
    }

    function initWorkers(parallelism, workerName) {
        return array(parallelism, function (i) {
            var worker = new Worker(workerName);
            if (initialJobs.length === parallelism)
                worker.postMessage(initialJobs[i], [initialJobs[i][toTransfer]]);
            return worker;
        });
    }

    function postNextJob(_jobs, _worker, _currentBatchId) {
        var job = _jobs.shift();
        if (job) {
            job.batchid = _currentBatchId;
            var transferList = job[_nameOfStandardTransferList];
            if(transferList) {
                _worker.postMessage(job, [transferList]);
            } else {
                _worker.postMessage(job);
            }
        }
    }

    var workers = initWorkers(noOfWorkers, workerUrl);
    var batchid = 0;
    return {
        consume: function (_jobs, _onEachJob, _onAllJobsComplete) {
            var jobsComplete = 0, jobsToComplete = _jobs.length, currentBatchId = batchid +=1;
            workers.forEach(function (worker) {
                worker.onmessage = function (e) {
                    var msg = e.data;
                    if(msg.batchid !== currentBatchId) {
                        return;
                    }
                    jobsComplete +=1;
                    postNextJob(_jobs, this, currentBatchId);
                    _onEachJob(msg);
                    if (jobsComplete === jobsToComplete) _onAllJobsComplete(msg);
                };
                postNextJob(_jobs, worker, currentBatchId);
            });
        },
        terminate: function () {
            workers.forEach(function (worker) {
               worker.terminate();
            });
        }
    };
};

namespace("jim.colour");
jim.colour.create = function (r, g, b, a) {
    "use strict";
    return {r: r, g: g, b: b, a: a};
};

namespace("jim.coord");
jim.coord.create = function (x, y) {
    "use strict";
    return {
        x: x,
        y: y,
        distanceTo: function (c) {
            return jim.coord.create(c.x - this.x, c.y - this.y);
        }
    };
};

namespace("jim.coord.translator");
jim.coord.translator.create = function (fromRect, fromPoint) {
    "use strict";
    return {
        translateTo: function (toRect) {
            return jim.coord.create(
                toRect.topLeft().x + (((fromPoint.x - fromRect.topLeft().x) * toRect.width()) / fromRect.width()),
                toRect.topLeft().y + (((fromPoint.y - fromRect.topLeft().y) * toRect.height()) / fromRect.height())
            );
        }
    };
};

namespace("jim.coord.translator2");
jim.coord.translator2.create = function () {
    "use strict";
    return {
        translateX: function (fromTopLeftX, fromWidth, toTopLeftX, toWidth, x) {
            var totalAmount = (((toWidth) / fromWidth) * (x - fromTopLeftX));
            return ((toTopLeftX) + totalAmount);
        },
        translateY: function (fromTopLeftY, fromHeight, toTopLeftY, toHeight, y) {
            var totalAmount = (((toHeight) / fromHeight) * (y - fromTopLeftY));
            return ((toTopLeftY) + totalAmount);
        }
    };
};

namespace("jim.rectangle");
jim.rectangle.create = function (one, two, width, height) {
    "use strict";
    var coord = jim.coord.create, x, y, w, h, topLeft, topRight, bottomLeft, bottomRight,
        present = function (x) {
            return x !== undefined;
        };
    if(present(one.w)) {
        x = one.x;
        y = one.y;
        w = one.w;
        h = one.h;
    } else {
        if (present(one.x)) {
            x = one.x;
            y = one.y;
            w = two.x;
            h = two.y;
        } else {
            x = one;
            y = two;
            w = width;
            h = height;
        }
    }


    topLeft = coord(x, y);
    topRight = coord(x + w, y);
    bottomLeft = coord(x, y + h);
    bottomRight = coord(x + w, y + h);

    return {
        x: topLeft.x,
        y: topLeft.y,
        topLeft: function () {
            return topLeft;
        },
        topRight: function () {
            return topRight;
        },
        bottomRight: function () {
            return bottomRight;
        },
        bottomLeft: function () {
            return bottomLeft;
        },
        width: function (val) {
            if (present(val)) {
                topRight.x = topLeft.x + val;
                bottomRight.x = topLeft.x + val;
                w = val;
            }
            return w;
        },
        height: function (val) {
            if (present(val)) {
                bottomLeft.y = topLeft.y + val;
                bottomRight.y = topLeft.y + val;
                h = val;
            }
            return h;
        },
        difference: function (_other) {
            return jim.rectangle.create(x - _other.x, y - _other.y, w - _other.width(), h - _other.height());
        },
        resize: function (w, h) {
            this.width(w);
            this.height(h);
        },
        at: function (x, y) {
            var translator = jim.coord.translator.create;
            if (present(x.x)) {
                return translator(this, x);
            }
            return translator(this, jim.coord.create(x, y));
        },
        copy: function () {
            return jim.rectangle.create(x, y, w, h);
        },
        place: function (_x, _y) {
            x = _x;
            y = _y;
            topLeft.x = _x;
            topLeft.y = _y;
            topRight.x = w + _x;
            topRight.y = _y;
            bottomRight.x = _x + w;
            bottomRight.y = _y + h;
            bottomLeft.x = _x;
            bottomLeft.y = _y + h;
        },
        move: function (ex, wy) {
            x += ex;
            y += wy;
            topLeft.x += ex;
            topLeft.y += wy;
            topRight.x += ex;
            topRight.y += wy;
            bottomRight.x += ex;
            bottomRight.y += wy;
            bottomLeft.x += ex;
            bottomLeft.y += wy;
        },
        split: function (numberOfRows) {
            var split = [];
            var newHeight = h / numberOfRows;

            for (var i = 0 ; i < numberOfRows; i +=1) {
                var y = topLeft.y + (i * newHeight);
                split.push(jim.rectangle.create(topLeft.x, y, w, newHeight));
            }
            return split;
        },
        translateFrom: function (source) {
            var selection = this;
            return {
                to: function (destination) {
                    var topLeft, bottomRight, w, h;
                    topLeft = source.at(selection.topLeft()).translateTo(destination);
                    bottomRight = source.at(selection.bottomRight()).translateTo(destination);
                    return jim.rectangle.create(topLeft, topLeft.distanceTo(bottomRight));
                }
            };
        }
    };
};

namespace("jim.common.imageExportProgressReporter");
jim.common.imageExportProgressReporter.create = function (_events, _event, _target) {
    "use strict";
    var completedSoFar = 0;
    var currentPercentComplete = 0;
    var roundedPercent = 0;
    var width = 0;
    var height = 0;
    _events.listenTo(_event, function (_number) {
        var num = parseInt(_number);
        var totalToComplete = width * height;
        completedSoFar += num;
        currentPercentComplete = (completedSoFar / totalToComplete) * 100;
        roundedPercent = Math.round(currentPercentComplete * 100) / 100;
        _target.innerText = "" + roundedPercent + "%";
        if(roundedPercent >= 100) {
            completedSoFar = 0;
            currentPercentComplete = 0;
            _target.innerText = "" + roundedPercent + "%";
        }
    });

    return {
        reportOn: function (w,h) {
            width = w;
            height = h;
        }
    };
};
namespace("jim.common.timeReporter");
jim.common.timeReporter.create = function (_target) {
    "use strict";
    var interval;
    var start = 0;
    var stop = 0;
    return {
        start: function () {
            start = new Date().getTime();

            var timefunc = function () {
                var time = Math.floor((new Date().getTime() - start) / 1000);
                _target.innerHTML = time;
            };

            timefunc();
            interval = setInterval(timefunc, 1000);
        },
        stop: function () {
            clearInterval(interval);
        }
    };
};


namespace("jim.interpolator");
jim.interpolator.create = function () {
    "use strict";
    return {
        interpolate: function (from, to, fraction) {
            return from + ((to - from) * fraction);
        }
    };
};

namespace("jim.common");
jim.common.round = function (number, decimalPlaces) {
    "use strict";
    var multiplier = 1;

    for (var i = 0 ; i < decimalPlaces ; i+=1) {
        multiplier *= 10;
    }
    return Math.round(number * multiplier) / multiplier;
};

namespace("jim.dom.functions");
jim.dom.functions.create = function () {
    "use strict";
    var buttonSelectedClass = "buttonSelected";
    var iconSelectedClass = "iconSelected";

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

    var selectIcon = function (_button) {
        if(!_button.classList.contains(iconSelectedClass)) {
            addClass(_button, iconSelectedClass);
        }
    };

    var deselectIcon = function (button) {
        removeClass(button, iconSelectedClass);
    };

    var hide = function (e) {
        e.style.display="none";
    };

    var show = function (e) {
        e.style.display = "";
    };

    var getElement = function (id) {
        return document.getElementById(id);
    };

    function setHtml (_e,_html) {
        _e.innerHTML = _html;
    }

    return {
        addClass: addClass,
        removeClass: removeClass,
        selectButton: selectButton,
        deselectButton: deselectButton,
        selectIcon: selectIcon,
        deselectIcon: deselectIcon,
        hide: hide,
        show: show,
        setHtml: setHtml,
        element: getElement
    };
};

function asyncCallerThing(arg) {
    promise = jim.promise.create(function (resolve) {
        resolve(arg);
    });
}

namespace("jim.promise");
jim.promise.create = function (initial) {
    "use strict";
    var deferred;
    var value;
    var state = 'pending';
    var p = {};
    p.promise = true;

    p.resolve = function (result) {
        if (result && result.promise) {
            result.then(p.resolve);
        } else {
            state = 'resolved';
            value = result;
            if (deferred) p.handle(deferred);
        }
    };

    p.handle = function (thing) {
        if(state === 'pending') {
            deferred = thing;
        } else {
            if (thing.chainedFunction) {
                var chainedResult = thing.chainedFunction(value);
                thing.resolve(chainedResult);
            } else {
                thing.resolve(value);
            }
        }
    };

    p.then = function (subsequentAction) {
        return jim.promise.create(function (resolve) {
            p.handle({
                chainedFunction: subsequentAction,
                resolve: resolve
            });
        });
    };


    initial(p.resolve);
    return p;
};

namespace("jim.anim.fixedLength");
jim.anim.fixedLength.create = function () {
    "use strict";
    return {
        drawFrames:     function (noOfFrames, f) {
            var n = -1;

            return jim.promise.create(function (resolve) {
                var innerF = function () {
                    n +=1;
                    if (n <= noOfFrames) {
                        f(n);
                        window.requestAnimationFrame(innerF);
                    } else {
                        resolve("Anim Complete");
                    }
                };
                window.requestAnimationFrame(innerF);
            });
        }
    };
};


namespace("jim.message.supplier");
jim.message.supplier.create = function (_messages) {
    "use strict";
    var messages = _messages ? _messages : [
        "Calculating Pixels",
        "Examining dead areas",
        "Reticulating splines",
        "Wombling free"
    ];
    var currentMessage = 0;
    return {
        next: function () {
            var message = messages[currentMessage];
            currentMessage +=1;
            if (currentMessage >= messages.length) {
                currentMessage = 0;
            }
            return message;
        }
    };
};

namespace("jim.anim.textBox");
jim.anim.textBox.create = function (canvas, _messages) {
    "use strict";
    var context = canvas.getContext('2d');
    var messages = jim.message.supplier.create(_messages);
    var textOffset = 13;
    function messageWidthInPixels(_msg) {
        var fontWidth = 7;
        return _msg.length * fontWidth;
    }

    function finalPositionForCentredMessage(canvasWidth, messageWidth) {
        return (canvasWidth - messageWidth) / 2;
    }

    function drawMsg() {
        context.font = "12px courier";

        function drawString(context, x, y) {
            clearCanvas(context);
            context.fillStyle="rgba(255,255,255,255)";
            context.fillText(msg,x,y);
        }

        function clearCanvas(context) {
            context.clearRect(0,0, canvas.width, canvas.height);
        }

        function slowingFunction(context, totalFrames, start, end) {
            return function (i) {
                var t = i;
                var totalS = Math.abs(end - start);
                var v = 0;
                var a = (-2 * totalS)/(totalFrames * totalFrames);
                var u = v - (a * totalFrames);
                var s = ( u * t) + (0.5 * a * t * t);

                var pos = start - s;
                drawString(context, pos, textOffset);
            };
        }

        function fasterFunction(context, totalFrames, start, end) {
            return function (i) {
                var t = i;
                var totalS = Math.abs(end - start);
                var u = 0;
                var a = (2 * totalS) / (totalFrames * totalFrames);
                var s = ( u * t) + (0.5 * a * t * t);

                var pos = start - s;
                drawString(context, pos, textOffset);
            };
        }

        function getHoldMessageFunction(context, start) {
            return function () { drawString(context, start, textOffset); };
        }

        var msg = messages.next();

        var anim = jim.anim.fixedLength.create();
        var messageWidth =  messageWidthInPixels(msg);
        var stopHere = finalPositionForCentredMessage(canvas.width,messageWidth);
        var scrollFrames = 40;
        var scrollMessageFunction2 = slowingFunction(context, scrollFrames, canvas.width, stopHere);
        anim.drawFrames(scrollFrames, scrollMessageFunction2)
            .then(function () {
                getHoldMessageFunction(context, stopHere)();
            }).then(function () {
                setTimeout(function () {
                    anim.drawFrames(scrollFrames, fasterFunction(context, scrollFrames, stopHere, 0 - messageWidth)).then(function () {
                        drawMsg();
                    });
                }, messageWidth * 15);

            });
    }
    drawMsg();
};