import { createEvents } from "../src/client/events.js";

describe("events", function () {
    it("should tell everyone who is listening", function () {
        const events = createEvents();
        let fired = "Nope";
        let fired2 = "Nope";
        const eventFired = function (e) {
            fired = e.data;
        };
        const eventFired2 = function (e) {
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

    it("should still tell later listeners when one fails", function () {
        const events = createEvents();
        let heard = false;
        spyOn(console, "error");
        events.listenTo("frame", function () { throw new Error("broken listener"); });
        events.listenTo("frame", function () { heard = true; });

        events.fire("frame");

        expect(heard).toBe(true);
        expect(console.error).toHaveBeenCalled();
    });
});
