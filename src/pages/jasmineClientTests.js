(function () {
    "use strict";
    var fs = require("fs"),
        template = require("view/template.js").create;
    var bagOStuff = {sourceFiles: "", testFiles:""};
        var callsMade = 0;
        var callQueued = 0;
        var filesToScripts = function (path, files, urlFragment, prop, renderCallback) {
            console.log("Calling filesToScripts");
            var returnVal = "";
            bagOStuff[prop] += '<script src="/js/common.js"></script>\n';
            callsMade += 1;
            console.log("calls queued is " + callQueued);
            if(callQueued > 0) {callQueued -= 1;}
            console.log("making a call " + callsMade);

            function buildPathFor(initialFilePath, additionalPath, file, index)  {
                var nextLevelDown = additionalPath + '/' + file;
                return function (err, stats) {
                    if (stats.isFile()) {
                        var entry = '<script src="' + urlFragment + nextLevelDown + '"></script>\n';
                        if(file !== ".DS_Store") {
                            bagOStuff[prop] += entry;
                        }
                        if (index >= files.length -1 ) {
                            callsMade -= 1;
                            if(callsMade === 0 && callQueued === 0) {
                                renderCallback();
                            }
                        }
                    } else {
                        if(stats.isDirectory()) {
                            callQueued += 1;
                            var newPath = initialFilePath + nextLevelDown;
                            fs.readdir(newPath, function (err, srcFiles) {

                                filesToScripts(newPath, srcFiles, urlFragment + nextLevelDown, prop, renderCallback);
                            });
                        }
                    }
                };
            }

            files.forEach(function (file, index) {
                fs.stat(path + '/' + file, buildPathFor(path, "", file, index));
            });
            return returnVal;
        };

    function doTestFiles(testFiles, f) {
        return function () {
            filesToScripts("test/client/jasmine/spec",testFiles, "specs", "testFiles", f);
        };
    }


    function render(f) {
        return function () {
            template("specRunner", bagOStuff).renderTo(f);
        };
    }
        var page = function (callback) {
            bagOStuff = {sourceFiles: "", testFiles:""};
            fs.readdir("test/client/jasmine/spec", function (err, testFiles) {
                fs.readdir("src/client", function (err, srcFiles) {
                    filesToScripts("src/client", srcFiles, "js", "sourceFiles", doTestFiles(testFiles,render(callback)));
                });
            });
        };

    exports.contents = function (callback) {
        page(callback);
    };
}());
