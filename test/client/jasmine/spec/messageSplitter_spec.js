describe("The message splitter", function () {


    function checkMessage(m, mx, my, rows, columns, stepX, stepY, offset) {
        expect(m.mx).toBe(mx);
        expect(m.my).toBe(my);
        expect(m.rows).toBe(rows);
        expect(m.columns).toBe(columns);
        expect(m.stepX).toBe(stepX);
        expect(m.stepY).toBe(stepY);
        expect(m.offset).toBe(offset);
    }

    it("should calculate the message for a simple example", function () {
        var renderOffset = 0, mx = 0, my = 0, mw = 10, mh = 5, numberOfRows = 6, numberOfColumns = 6;
        var fragment = jim.messages.renderFragment2.create(renderOffset, mx, my, mw, mh, numberOfColumns, numberOfRows);

        //|_0|_2|_4|_6|_8|10| -> chunk 1
        //|_1|__|__|__|__|__| |
        //|_2|__|__|__|__|__| -> chunk 2
        //|_3|__|__|__|__|__| |
        //|_4|__|__|__|__|__| -> chunk 3
        //|_5|__|__|__|__|__| |

        var fragments = fragment.split(3);
        expect(fragments.length).toBe(3);

        checkMessage(fragments[0], 0,0,2,6,2,1,0);
        checkMessage(fragments[1], 0,2,2,6,2,1,12);
        checkMessage(fragments[2], 0,4,2,6,2,1,24);
    });

    it("should calculate the message when not starting at 0", function () {
        var renderOffset = 0, mx = 0, my = 5, mw = 10, mh = 5, numberOfRows = 6, numberOfColumns = 6;
        var fragment = jim.messages.renderFragment2.create(renderOffset, mx, my, mw, mh, numberOfColumns, numberOfRows);

        //|0,5|2,5|4,5|6,5|8,5|10,5|  -> chunk 1
        //|0,6|___|___|___|___|____|  |
        //|0,7|___|___|___|___|____|  -> chunk 2
        //|0,8|___|___|___|___|____|  |
        //|0,9|___|___|___|___|____|  -> chunk 3
        //|0,0|___|___|___|___|____|  |

        var fragments = fragment.split(3);
        expect(fragments.length).toBe(3);

        checkMessage(fragments[0], 0,5,2,6,2,1,0);
        checkMessage(fragments[1], 0,7,2,6,2,1,12);
        checkMessage(fragments[2], 0,9,2,6,2,1,24);
    });

    it("should calculate the message when starting at -1.5 and step is 0.5 and some rows are left over", function () {
        var renderOffset = 0, mx = 0, my = -1.5, mw = 10, mh = 5, numberOfRows = 11, numberOfColumns = 6;
        var fragment = jim.messages.renderFragment2.create(renderOffset, mx, my, mw, mh, numberOfColumns, numberOfRows);

        //|0,-1.5|2,-1.5|4,-1.5|6,-1.5|8,-1.5|10,-1.5|  chunk 1
        //|0,-1.0|______|______|______|______|_______|
        //|0,-0.5|______|______|______|______|_______|
        //|0,0.0_|______|______|______|______|_______|  chunk 2
        //|0,0.5_|______|______|______|______|_______|
        //|0,1.0_|______|______|______|______|_______|
        //|0,1.5_|______|______|______|______|_______|  chunk 3
        //|0,2.0_|______|______|______|______|_______|
        //|0,2.5_|______|______|______|______|_______|
        //|0,3.0_|______|______|______|______|_______|
        //|0,3.5_|______|______|______|______|_______|

        var fragments = fragment.split(3);
        expect(fragments.length).toBe(3);

        checkMessage(fragments[0], 0, -1.5, 3, 6, 2, 0.5, 0);
        checkMessage(fragments[1], 0, 0,    3, 6, 2, 0.5, 18);
        checkMessage(fragments[2], 0, 1.5,  5, 6, 2, 0.5, 36);
    });

});