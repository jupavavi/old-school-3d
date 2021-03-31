import { numberToDefault } from "./utils";
import Varyings from "./Varyings";

export default (raster) => {
    // keeps pre-located vertices data. This reduces GC cycles.
    let cache = [];
    // controls if data for every cached vertices should be recalculated
    let renderSerial = 0; 
    // controls if attrs for every cached vertices should be extracted from the current buffer
    let attrsSerial = 0; 
    let buffer = null;
    
    const loadBuffer = (bufferData) => {
        if (buffer !== bufferData && bufferData) {
            buffer = bufferData;
            attrsSerial++;
        }
        // resizes the current array - yes, JS arrays are way too exotic
        if (cache.length < buffer.vertexCount) {
            cache.length = buffer.vertexCount;
        }
    };
    const getVertex = (idx, uniforms, shader) => {
        // allocate the vertex data for the first time in cache
        if (!cache[idx]) {
            cache[idx] = {
                renderSerial: -1,
                attrsSerial: -1,
                data: new Varyings(),
            };
        }

        if (cache[idx].attrsSerial !== attrsSerial) {
            // extracts attrs again
            cache[idx].attrsSerial = attrsSerial;
            cache[idx].attrs = buffer.getVertexData(idx);
        }

        if (cache[idx].renderSerial !== renderSerial) {
            // calculates data again
            cache[idx].renderSerial = renderSerial;
            shader(cache[idx].data, cache[idx].attrs, uniforms);
        }
        return cache[idx].data; // returns the allocated vertex data
    };

    const rasterTriangle = (idx0, idx1, idx2, uniforms, shader) => {
        const { indices } = buffer;
        raster.rasterTriangle(
            getVertex(numberToDefault(indices?.[idx0], idx0), uniforms, shader),
            getVertex(numberToDefault(indices?.[idx1], idx1), uniforms, shader),
            getVertex(numberToDefault(indices?.[idx2], idx2), uniforms, shader),
        );
    };
    const rasterLine = (idx0, idx1, uniforms, shader) => {
        const { indices } = buffer;
        raster.rasterLine(
            getVertex(numberToDefault(indices?.[idx0], idx0), uniforms, shader),
            getVertex(numberToDefault(indices?.[idx1], idx1), uniforms, shader),
        );
    };
    return {
        loadBuffer,
        get buffer() { return buffer; },
        TRIANGLES: (offset, count, uniforms, shader) => {
            renderSerial++;
            const limit = offset + count;
            for(let i = offset; i < limit; i += 3) {
                rasterTriangle(i, i + 1, i + 2, uniforms, shader);
            }
        },
        TRIANGLE_STRIP: (offset, count, uniforms, shader) => {
            renderSerial++;
            const limit = offset + count - 2;
            for(let i = offset; i < limit; i += 1) {
                rasterTriangle(i + 2, i, i + 1, uniforms, shader);
            }
        },
        TRIANGLE_FAN: (offset, count, uniforms, shader) => {
            renderSerial++;
            const limit = offset + count - 1;
            for(let i = offset + 1; i < limit; i += 1) {
                rasterTriangle(offset, i, i + 1, uniforms, shader);
            }
        },
        LINES: (offset, count, uniforms, shader) => {
            renderSerial++;
            const limit = offset + count;
            for(let i = offset; i < limit; i += 2) {
                rasterLine(i, i + 1, uniforms, shader);
            }
        },
        LINE_LOOP: (offset, count, uniforms, shader) => {
            renderSerial++;
            for(let i = 0; i < count; i += 1) {
                rasterLine(i + offset, ((i + 1) % count) + offset, uniforms, shader);
            }
        },
        LINE_STRIP: (offset, count, uniforms, shader) => {
            renderSerial++;
            const limit = offset + count;
            for(let i = offset; i < limit; i += 1) {
                rasterLine(i, i + 1, uniforms, shader);
            }
        },
    };
};
