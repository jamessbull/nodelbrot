var webdriver = require('selenium-webdriver');

exports.driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
exports.by = webdriver.By;