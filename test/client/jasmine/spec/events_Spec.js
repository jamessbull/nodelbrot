describe("events", function () {
    "use strict";
    it("should tell everyone who is listening", function () {
        var events = jim.events.create();
        var fired = "Nope";
        var fired2 = "Nope";
        var eventFired = function (e) {
            fired = e.data;
        };
        var eventFired2 = function (e) {
            fired2 = e.data;
        };

        events.listenTo("event1", eventFired);
        events.listenTo("event1", eventFired2);
        expect(fired).toBe("Nope");
        expect(fired2).toBe("Nope");

        events.fire("notThatEvent", {data:"Yep"});
        expect(fired).toBe("Nope");

        events.fire("event1", {data:"Yep"});
        expect(fired).toBe("Yep");
        expect(fired2).toBe("Yep");
    });
});
