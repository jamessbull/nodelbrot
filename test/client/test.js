var server = require("webserver.js"),
    web = require("driver.js"),
    driver = web.driver,
    by = web.by;

driver.get('http://127.0.0.1:8124/');

driver.wait(function () {
    "use strict";
    return driver.getTitle().then(function (title) {
        return title === 'Hello';
    });
}, 1000);

driver.quit().then(function () {
    process.exit();
});