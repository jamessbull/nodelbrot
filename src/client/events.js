namespace("jim.events");
jim.events.create = function () {
    "use strict";
    var listeners = {};
    return {
        listenTo: function (event, action) {
            if(!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(action);
        },
        fire: function (event, arg) {
            if (listeners[event]) {
                listeners[event].forEach(function (action) { action(arg); });
            }
        },
        clear:function () {
            listeners = {};
        }
    };
};

var events = jim.events.create();