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

namespace("jim.histogram");
jim.histogram.create = function () {
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
