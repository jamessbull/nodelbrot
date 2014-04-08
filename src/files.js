var fs = require("fs");
exports.create = function () {
    "use strict";
    return {
        inDir: function (dir, callback) {
            return fs.readdir(dir, callback);
        }
    };
};