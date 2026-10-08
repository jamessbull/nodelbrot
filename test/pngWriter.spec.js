import { inflateSync } from "node:zlib";
import { writePng } from "../src/client/export/pngWriter.js";

// The chunks of a PNG, as {type, data}, checking each one's CRC.
function chunks(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const found = [];
    for (let at = 8; at < bytes.length;) {
        const length = view.getUint32(at);
        const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
        found.push({type, data: bytes.subarray(at + 8, at + 8 + length), crc: view.getUint32(at + 8 + length)});
        at += 12 + length;
    }
    return found;
}

// CRC-32 the slow way, to check against.
function crc(bytes) {
    let c = 0xFFFFFFFF;
    for (const b of bytes) {
        c ^= b;
        for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : c >>> 1;
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

describe("PNG writer", function () {
    it("should write the image a strip at a time, as a PNG that reads back the same", async function () {
        const width = 37, height = 23;
        const image = new Uint8Array(width * height * 4).map((unused, i) => (i * 7919) % 251);
        const asked = [];
        const blob = await writePng(width, height, function (from, to) {
            asked.push([from, to]);
            return image.subarray(from * width * 4, to * width * 4);
        }, {stripBytes: 5 * ((width * 4) + 1)});
        expect(asked[0]).toEqual([0, 5]);
        expect(asked[asked.length - 1]).toEqual([20, 23]);

        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        const found = chunks(bytes);
        found.forEach((c) => expect(c.crc).withContext(c.type).toBe(crc(new Uint8Array([...[...c.type].map((x) => x.charCodeAt(0)), ...c.data]))));
        expect(found[0].type).toBe("IHDR");
        expect(found[found.length - 1].type).toBe("IEND");
        const ihdr = new DataView(found[0].data.buffer, found[0].data.byteOffset);
        expect([ihdr.getUint32(0), ihdr.getUint32(4)]).toEqual([width, height]);

        // Undo the Sub filter and compare.
        const raw = inflateSync(Buffer.concat(found.filter((c) => c.type === "IDAT").map((c) => c.data)));
        const rowBytes = 1 + (width * 4);
        expect(raw.length).toBe(rowBytes * height);
        const decoded = new Uint8Array(width * height * 4);
        for (let row = 0; row < height; row += 1) {
            expect(raw[row * rowBytes]).toBe(1);
            for (let i = 0; i < width * 4; i += 1) {
                const left = i >= 4 ? decoded[(row * width * 4) + i - 4] : 0;
                decoded[(row * width * 4) + i] = (raw[(row * rowBytes) + 1 + i] + left) & 0xFF;
            }
        }
        expect(Array.from(decoded)).toEqual(Array.from(image));
    });
});
