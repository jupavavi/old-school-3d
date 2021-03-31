import defaultFragShader from "./shaders/frag/default";
import Varyings from "./Varyings";

export default({ depthTest, writePixel }) => {

    let tmpAttrsA = new Varyings();
    let tmpAttrsB = new Varyings();
    let tmpAttrsC = new Varyings();
    let fragShader = defaultFragShader;
    let uniforms = {};

    // sorts vertex from the top most to the bottom most (y increases from top to bottom in screen coords)
    const sorter = (v0, v1) => v0.position[1] - v1.position[1];

    const scanline = (x0, z0, x1, z1, y, attrs0, attrs1) => {
        let tmp = null;
        if (x0 > x1) {
            tmp = x0; x0 = x1; x1 = tmp;
            tmp = z0; z0 = z1; z1 = tmp;
            tmp = attrs0; attrs0 = attrs1; attrs1 = tmp;
        }
        const dt = 1 / Math.abs(x1 - x0);
        const dz = z1 - z0;
        let z = z0;
        for(let x = x0; x < x1; x++) {
            const t = (x - x0) * dt;
            z = z0 + dz * t;
            if (depthTest(x, y, z)) {
                tmpAttrsC.setInterpolatePerspCorrected(attrs0, attrs1, t);
                writePixel(x, y, z, fragShader(tmpAttrsC, uniforms));
            }
        }
    };

    return {
        get uniforms() { return uniforms; },
        set uniforms(value) { uniforms = value; },
        get fragShader() { return fragShader; },
        set fragShader(value) { fragShader = value; },

        drawLine(v0, v1) {
            let { 0: x0, 1: y0, 2: z0 } = v0.position;
            let { 0: x1, 1: y1, 2: z1 } = v1.position;
            let { attrs: attrs0 } = v0;
            let { attrs: attrs1 } = v1;
        
            const dx = Math.abs(x1 - x0);
            const dy = Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx - dy;
            
            let m = dx > dy ? 1 / dx : 1 / dy; // interpolation incerement
            let t = 0; // interpolation value
            const dz = z1 - z0;
        
            while (true) {
                const z = z0 + dz * t;
                if (depthTest(x0, y0, z)) {
                    tmpAttrsA.setInterpolatePerspCorrected(attrs0, attrs1, t);
                    writePixel(x0, y0, z, fragShader(tmpAttrsA, uniforms));
                }
                if (x0 === x1 && y0 === y1) break;
                const e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
                t += m;
            }
        },
        
        fillTriangle() {
            Array.prototype.sort.call(arguments, sorter);
            const { 0: v0, 1: v1, 2: v2 } = arguments;
            // at this point v0[1] <= v1[1] <= v2[1] 
            
            let { 0: x0, 1: y0, 2: z0 } = v0.position;
            let { 0: x1, 1: y1, 2: z1 } = v1.position;
            let { 0: x2, 1: y2, 2: z2 } = v2.position;
            const { attrs: attrs0 } = v0;
            const { attrs: attrs1 } = v1;
            const { attrs: attrs2 } = v2;
        
            x0 |= 0; y0 |= 0; z0 |= 0;
            x1 |= 0; y1 |= 0; z1 |= 0;
            x2 |= 0; y2 |= 0; z2 |= 0;
        
            const curAttrsA = tmpAttrsA;
            const curAttrsB = tmpAttrsB;
            
            let dya = y1 - y0;
            let dyb = y2 - y0;
            let dza = z1 - z0;
            let dzb = z2 - z0;
            let invslope1 = (x1 - x0) / dya;
            let invslope2 = (x2 - x0) / dyb;
            let curx1 = x0;
            let curx2 = x0;
        
            // top part of the triangle
            for (let scanlineY = y0; scanlineY < y1; scanlineY++) {
                const ta = (scanlineY - y0) / dya;
                const tb = (scanlineY - y0) / dyb;
                const curz0 = z0 + dza * ta;
                const curz1 = z0 + dzb * tb;
                curAttrsA.setInterpolatePerspCorrected(attrs0, attrs1, ta);
                curAttrsB.setInterpolatePerspCorrected(attrs0, attrs2, tb);
                scanline(curx1 | 0, curz0, curx2 | 0, curz1, scanlineY, curAttrsA, curAttrsB);
                curx1 += invslope1;
                curx2 += invslope2;
            }
        
            if (y1 >= y2) return;
            // bottom part of the triangle
            dya = y2 - y1;
            dza = z2 - z1;
            invslope1 = (x2 - x1) / dya;
            curx1 = x1;
        
            for (let scanlineY = y1; scanlineY < y2; scanlineY++) {
                const ta = (scanlineY - y1) / dya;
                const tb = (scanlineY - y0) / dyb;
                const curz0 = z1 + dza * ta;
                const curz1 = z0 + dzb * tb;
                curAttrsA.setInterpolatePerspCorrected(attrs1, attrs2, ta);
                curAttrsB.setInterpolatePerspCorrected(attrs0, attrs2, tb);
                scanline(curx1 | 0, curz0, curx2 | 0, curz1, scanlineY, curAttrsA, curAttrsB);
                curx1 += invslope1;
                curx2 += invslope2;
            }
        },
    };
}
