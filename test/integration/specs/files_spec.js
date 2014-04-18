describe("The Files", function () {
    "use strict";
    it("should list all files in a directory", function (done) {
        var files = require("files.js").create(),
            expectedDirContents = ["bees", "cheese"];
        files.inDir("test/integration/filesTest/", function (err, dirContents) {
            expectedDirContents.forEach(function (expected) {
                var filtered = dirContents.filter(function (actual) {
                    return actual === expected;
                });
                expect(filtered[0]).toBe(expected);
            });
            done();
        });
    });
    it("should load files and call the supplied function when file loading is complete", function (done) {
        var files = require("files.js").create(),
            templatesToLoad = ["test/integration/filesTest/cheese", "test/integration/filesTest/bees"];
        files.withFiles(templatesToLoad, function (err, files) {
            expect(files[templatesToLoad[0]]).toBe("cheese");
            expect(files[templatesToLoad[1]]).toBe("bees");
            done();
        });
    });
});
