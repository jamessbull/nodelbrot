describe("The Files", function () {
    "use strict";
    it("should list all files in a directory", function () {
        var files = require("files.js").create(),
            expectedDirContents = ["bees", "cheese"];

        files.inDir("test/integration/filesTest/", function (dirContents) {
            expectedDirContents.forEach(function (expected) {
                var filtered = dirContents.filter(function (actual) {
                    return actual === expected;
                });
                expect(filtered[0]).toBe(expected);
            });
        });
    });
});
