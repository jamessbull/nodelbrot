var testEnvironment = require("testEnvironment.js"),
    tests = require("tests.js");

testEnvironment.start();
testEnvironment.run(tests.jasmine);
testEnvironment.stop();
