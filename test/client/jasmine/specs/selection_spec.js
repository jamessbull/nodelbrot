describe("a ui selection", function () {
    "use strict";
    it("should describe a rectangular selection with the same proportions as the specified rectangle based on the size of movement in the x direction", function () {
        var newRect = jim.rectangle.create,
            coord = jim.coord.create,
            newSelection = jim.selection.create,
            event = function (x,y) {return {layerX: x, layerY: y}; },
            rect = newRect(0, 0, 20, 10),
            selection = newSelection(rect);

        expect(selection.inProgress).toBe(false);

        selection.begin(event(5, 5));
        selection.change(event(15, 40));

        expect(selection.area().bottomLeft()).toEqual(coord(5, 5));
        expect(selection.area().topRight()).toEqual(coord(15, 5));
        expect(selection.area().bottomLeft()).toEqual(coord(5, 10));
        expect(selection.area().topRight()).toEqual(coord(15, 10));
        expect(selection.area().width()).toBe(10);
        expect(selection.area().height()).toBe(5);
        expect(selection.inProgress).toBe(true);

        selection.change(event(45, -2));

        expect(selection.area().bottomLeft()).toEqual(coord(5, 5));
        expect(selection.area().topRight()).toEqual(coord(45, 5));
        expect(selection.area().bottomLeft()).toEqual(coord(5, 25));
        expect(selection.area().topRight()).toEqual(coord(45, 25));
        expect(selection.area().width()).toBe(40);
        expect(selection.area().height()).toBe(20);
        expect(selection.inProgress).toBe(true);


        selection.end(event(65, 32));

        expect(selection.area().bottomLeft()).toEqual(coord(5, 5));
        expect(selection.area().topRight()).toEqual(coord(65, 5));
        expect(selection.area().bottomLeft()).toEqual(coord(5, 35));
        expect(selection.area().topRight()).toEqual(coord(65, 35));
        expect(selection.area().width()).toBe(60);
        expect(selection.area().height()).toBe(30);
        expect(selection.inProgress).toBe(false);

    });
});