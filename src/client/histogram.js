namespace("jim.arrays");
jim.arrays.find = function (numberAt, numberToFind) {
    var found = false, offset = Math.floor(numberAt.length / 2), currentIndex = Math.floor(numberAt.length / 2);
    while (!found) {
        if (numberAt.length === 0) {
            return 0;
        }
        if (numberAt[currentIndex] === numberToFind) {
            return currentIndex;
        }
        if (numberAt[currentIndex] > numberToFind && currentIndex === 0) {
            return 0;
        }
        if (numberAt[currentIndex] < numberToFind && currentIndex === numberAt.length - 1) {
            return numberAt.length;
        }
        if (numberAt[currentIndex] > numberToFind && numberAt[currentIndex - 1] < numberToFind) {
            return currentIndex;
        }
        offset = Math.max(Math.floor(offset / 2), 1);
        if (numberAt[currentIndex] > numberToFind) {
            currentIndex -= offset;
        } else {
            currentIndex += offset;
        }
    }
}
jim.arrays.orderedInsert = function(array, value) {
    var find = jim.arrays.find,
        index = find(array, value);
    array.splice(index, 0, value);
    return index;
}

jim.arrays.ripple = function (array, index, riplee) {
    var i;
    for (i = index; i < array.length;  i += 1) {
        riplee[array[i]] +=1;
    }
};
//New histogram
//simple like the two phase histogram
//array which gets added to
// I just add at the appropriate number just need to ripple up on insert
// to do that I just keep track of largest number yet reached
// try splicing a new array when it reaches 10000? or make it 10,000 max and bail on max iterartions at 10k

namespace("jim.histogram");
jim.histogram.create = function () {
    "use strict";
    var data;
    var total = 0;
    var maxVal = 1;
    var i;
    var reset = function () {
        total = 0;
        maxVal = 1;
        data = [];
        for (i = 0; i < 10000; i +=1) {
            data[i] = 0;
        }
    };
    reset();
    var add = function (value) {
        // adding before latest value need to ripple up to maxValue
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
    var no;
    var percentEscapedBy = function (i) {
        no = data[i];
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
        }
    };
};

namespace("jim.histogramold");
jim.histogramold.create = function () {
    "use strict";
    var state = {},
        total = 0,
        keys = [],
        ripple = jim.arrays.ripple,
        insert = jim.arrays.orderedInsert,
        find = jim.arrays.find,
        insertNewHistogramValue = function (number) {
            var index = insert(keys, number);
            if(index === 0) {
                state[number] = 0;
            } else {
                state[number] = state[keys[index - 1]];
            }
            return index;
        },
        findOrInsert = function (number) {
            if (!state[number]) {
                return insertNewHistogramValue(number);
            } else {
                return find(keys, number);
            }
        };

    return {
        add: function (number) {
            var index = findOrInsert(number);
            ripple(keys, index, state);
            total += 1;
        },
        get: function (number) {
            var check = number;
            while (!state[check] && check > 0) {
                check -= 1;
            }
            if(check === 0) {
                return 1;
            }
            return state[check];
        },
        percentEscapedBy: function (iteration) {
            var escaped = this.get(iteration);
            if (escaped === 0) {
                return 0;
            }
            return escaped / total;
        },
        rebuild: function (grid) {
            this.reset();
            var that = this;
            grid.iterateVisible(function (point) {
                if (point.alreadyEscaped){
                    that.add(point.escapedAt);
                }
            });
        },
        numberEscapedBy: function (iteration) {
            return this.get(iteration);
        },
        total: function () {
            return total;
        },
        keySize: function () {return keys.length; },
        reset : function () {
            state = {};
            total = 0;
            keys = [];
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
        var total = 0;
        for (var i = 0 ; i < _size; i +=1) {
            total += data[i];
            data[i] = total;
        }
    };
    var percentEscapedBy = function (i) {
        var no = data[i];
        return no === 0 ? 0 : no / total;
    };
    return {
        add: add,
        percentEscapedBy: percentEscapedBy,
        process: process,
        setData: function (_data, _total) {
            data = _data;
            total = _total;
        }
    };
};
