namespace("jim.histogram");
jim.histogram.create = function () {
    "use strict";
    var data;
    var total = 0;
    var maxVal = 1;

    var reset = function () {
        total = 0;
        maxVal = 0;
        data = [];
        for (var i = 0; i < 10000; i +=1) {
            data[i] = 0;
        }
    };
    reset();
    var add = function (value) {
        // adding before latest value need to ripple up to maxValue
        var i;
        if (value < maxVal) {
            for (i = value; i <= maxVal; i++) {
                data[i] +=1;
            }
        }
        // adding at the end just increment
        if (value === maxVal) {
            data[value] +=1;
        }
        // adding later than lastValue need to start at lastVal + 1 and go to value things will be 0 so set to total +1
        if (value > maxVal) {
            for (i = maxVal +1; i <= value; i ++) {
                data[i] = total;
            }
            data[value] += 1;
        }

        total += 1;
        if (maxVal < value) {
            maxVal = value;
        }
    };
    var percentEscapedBy = function (i) {
        var no = data[i];
        return no === 0 ? 0 : no / total;
    };
    var get = function (n) {
        return data[n];
    };
    var getTotal = function () {
        return total;
    };
    var rebuild = function (grid) {
        reset();
        grid.iterateVisible(function (point) {
            if (point.alreadyEscaped){
                add(point.escapedAt);
            }
        });
    };
    return {
        add :add,
        get: get,
        percentEscapedBy: percentEscapedBy,
        total: getTotal,
        reset: reset,
        rebuild: rebuild,
        data: function () {
            return data;
        },
        id : function () {
            //console.log("riginal an ting");
        }
    };
};

namespace("jim.twoPhaseHistogram");
    jim.twoPhaseHistogram.create = function (_size) {
    "use strict";
    var data = [], total = 0;
    for (var i = 0; i < _size; i +=1) {
        data[i] = 0;
    }

    var add = function (value) {
        data[value] +=1;
        total += 1;
    };

    var process = function () {
        var localTotal = 0;
        for (var i = 0 ; i < data.length; i +=1) {
            if(!data[i]) {
                data[i] = 0;
            }
            localTotal += data[i];
            data[i] = localTotal;
        }
        total = data[data.length -1];
    };

    var percentEscapedBy = function (i) {
        var no = data[i];
        return no === undefined ? 1 : no === 0 ? 0 : no / total;
    };

    var get = function (n) {
        return data[n];
    };

    return {
        add: add,
        percentEscapedBy: percentEscapedBy,
        process: process,
        get: get,
        setData: function (_data, _total) {
            data = _data;
            total = _total;
        },
        id: function () {
            //console.log("Two phase histo. Length is " + data.length );
        },
        total: function () {
            return total;
        },
        data: function () {
            return data;
        }
    };
};