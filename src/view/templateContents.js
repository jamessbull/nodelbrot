exports.init = function (baseDir) {
    "use strict";
    var fs = require("fs"),
        hbl = require("handlebars"),
        files = fs.readdirSync(baseDir),
        stripExtension = function (fileName) {
            var index = fileName.indexOf(".");
            if (index === -1) {
                return fileName;
            }
            return fileName.substring(0, index);
        },
        contents = {};
    files.forEach(function (file) {
        var name = stripExtension(file),
            fileContents = fs.readFileSync(baseDir + "/" + file, {encoding: 'utf8'});
        contents[name] = hbl.compile(fileContents);
    });
    contents.empty = "";
    return contents;
};
