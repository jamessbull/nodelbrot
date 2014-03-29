var webdriver = require('selenium-webdriver'), driver;

exports.by = webdriver.By;

exports.start = function () {
    "use strict";
    require("webserver.js");
    driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
    driver.get('http://127.0.0.1:8124/');
};

exports.run = function (f) {
    "use strict";
    f(driver);
};

exports.stop = function () {
    "use strict";
    driver.quit().then(function () {
        process.exit();
    });
};
