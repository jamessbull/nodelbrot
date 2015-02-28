namespace("jim.histogram");
jim.histogram.create = function () {
    "use strict";
    var state = {},
        total = 0;
    return {
        add: function (number) {
            if (!state[number]) {
                state[number] = 1;
            } else {
                state[number] += 1;
            }
            total += 1;
        },
        get: function (number) {
            return state[number];
        },
        percentEscapedBy: function (iteration) {
            var i, pc = 0;
            for (i = 0; i <= iteration; i += 1) {
                if (state[i]) {
                    pc += this.get(i);
                }
            }
            return pc / total;
        },
        total: function () {
            return total;
        }
    };
};