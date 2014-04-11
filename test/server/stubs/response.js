exports.create = function () {
    "use strict";
    var written = "";
    return {
        write: function (content) { written = content; },
        written: function () { return written; },
        end: function () {}
    };
}
