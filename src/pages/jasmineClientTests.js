(function () {
    "use strict";
    var fs = require("fs"),
        template = require("view/template.js").create,
        filesToScripts = function (files, urlFragment) {
            var returnVal = "";
            returnVal += '<script src="/js/common.js"></script>\n';
            files.forEach(function (file) {
                returnVal += '<script src="/' + urlFragment + '/' + file + '"></script>\n';
            });
            return returnVal;
        },
        page = function (callback) {
            fs.readdir("test/client/jasmine/specs", function (err, testFiles) {
                fs.readdir("src/client", function (err, srcFiles) {
                    template("specRunner", {
                        sourceFiles: filesToScripts(srcFiles, "js"),
                        testFiles: filesToScripts(testFiles, "specs")
                    }).renderTo(callback);
                });
            });
        };

    exports.contents = function (callback) {
        page(callback);
    };
}());
