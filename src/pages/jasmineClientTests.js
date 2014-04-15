(function () {
    "use strict";
    var fs = require("fs"),
        template = require("view/template.js").create,
        filesToScripts = function (files, urlFragment) {
            var returnVal = "";
            files.forEach(function (file) {
                returnVal += '<script src="/' + urlFragment + '/' + file + '"></script>\n';
            });
            return returnVal;
        },
        head = function (testFiles, srcFiles) {
            var head = "";
            head += filesToScripts(testFiles, "specs");
            head += filesToScripts(srcFiles, "js");
            head += '<title>Jasmine Tests</title>';
            return head;
        },
        page = function (callback) {
            fs.readdir("test/client/jasmine/specs", function (err, testFiles) {
                fs.readdir("src/client", function (err, srcFiles) {
                    template("html", {head: head(testFiles, srcFiles), body: "I am body"})
                        .renderTo(callback);
                });
            });
        };

    exports.contents = function (callback) {
        page(callback);
    };
}());
