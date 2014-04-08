var fs = require("fs");
exports.create = function () {
    "use strict";
    return {
        inDir: function (dir, callback) {
            fs.readdir(dir, callback);
        },
        withFiles: function (files, callback) {
            var loadedFiles = {},
                fileLoaded = function (file) { return loadedFiles[file]; },
                callbackWhenAllFilesLoaded = function () {
                    if (files.every(fileLoaded)) {
                        callback(null, loadedFiles);
                    }
                },
                handleError = function (err) {
                    if (err) {
                        console.log("err is " + err);
                        callback(err, null);
                    }
                };

            files.forEach(function (file) {
                fs.readFile(file, {encoding: 'utf8'}, function (err, contents) {
                    handleError(err);
                    loadedFiles[file] = contents;
                    callbackWhenAllFilesLoaded();
                });
            });
        }
    };
};