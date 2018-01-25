var UglifyJS = require('uglify-es');
var fs = require('fs');

var files = [
    "../latest/js/combinedWorker.js",
    "../latest/js/histogramCalculatingWorker.js",
    "../latest/js/mandelbrotExplorer.js",
    "../latest/js/mandelbrotImageCalculatingWorker.js"
];

function minify(file, reserved) {
    "use strict";
    var fileWithoutStrict = file;
    var strictDef = /"use strict";/g;
    fileWithoutStrict = file.replace(strictDef, "");
    var result = UglifyJS.minify(fileWithoutStrict,  { mangle: { reserved: reserved } });
    //console.log(result.error); // runtime error, or `undefined` if no error
    console.log(result.code);
    return result.code;
}

function replaceNames (file, oldNames, newNames) {
    var replacedFile = file;
    oldNames.forEach(function (name, i) {
        replacedFile = replacedFile.replace(name, newNames[i]);
    });
    return replacedFile;
}

files.forEach(function (fileName) {
    var oldNames = ['/js/combinedWorker.js', "/js/histogramCalculatingWorker.js", "/js/mandelbrotImageCalculatingWorker"];
    var newNames = ['/js/combinedWorker-min.js', "/js/histogramCalculatingWorker-min.js", "/js/mandelbrotImageCalculatingWorker-min.js"];
    var file = fs.readFileSync(fileName, "utf8");
    file = replaceNames(file, oldNames, newNames);
    var min = minify(file, newNames);
    fs.writeFileSync(fileName.slice(0, fileName.length -3) + "-min.js", min);
});

