var testEnvironment = require("testEnvironment.js"),
    tests = function () {
        "use strict";
        var fs = require("fs"),
            testNames = fs.readdirSync(process.cwd() + "/test/client/tests"),
            tests = [];

        testNames.forEach(function (name) {
            var test = require("tests/" + name);
            Object.keys(test).forEach(function (key) {
                tests.push(test[key]);
            });
        });
        return tests;
    };

exports.run = function (expectations) {
    testEnvironment.assert(expectations);
    testEnvironment.start();
    testEnvironment.run(tests());
    testEnvironment.stop();
};

