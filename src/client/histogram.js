namespace("jim.twoPhaseHistogram");
    jim.twoPhaseHistogram.create = function (_size) {
    "use strict";
    var  total = 0;
    var data = new Uint32Array(_size);
    var size = _size;


    var add = function (value) {
        if(value < size) {
            data[value] +=1;
            total += 1;
        }
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
            size = _data.length;
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