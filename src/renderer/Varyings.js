export default class Varyings {
    position = [0, 0, 0, 0];
    wPosition = [0, 0, 0];
    color = [0, 0, 0, 0];
    normal = [0, 0, 0];
    uv = [0, 0];
    uv2 = [0, 0];
    
    constructor(other) {
        if (other) {
            const attrsNames = Object.keys(this);
            const { length } = attrsNames;
            for (let i = 0; i < length; i += 1) {
                const attr = attrsNames[i];
                this[attr] = other[attr].slice();
            }
        }
    }

    setInterpolation(a, b, t) {
        const attrsNames = Object.keys(this);
        const { length } = attrsNames;
        
        for (let i = 0; i < length; i += 1) {
            const attr = attrsNames[i];
            const adata = a[attr];
            const bdata = b[attr];
            const odata = this[attr];
            for (let j = 0; j < odata.length; j += 1) {
                odata[j] = adata[j] + (bdata[j] - adata[j]) * t;
            }
        }
    }

    setInterpolatePerspCorrected(a, b, t) {
        const { 3: w0 } = a.position;
        const { 3: w1 } = b.position;
        const rw0 = 1 / w0;
        const rw1 = 1 / w1;
        const w = 1 / (rw0 + t * (rw1 - rw0));
        const r0 = rw0 * w;
        const r1 = rw1 * w;

        const attrsNames = Object.keys(this);
        const { length } = attrsNames;
        
        for (let i = 0; i < length; i += 1) {
            const attr = attrsNames[i];
            const adata = a[attr];
            const bdata = b[attr];
            const odata = this[attr];
            for (let j = 0; j < odata.length; j += 1) {
                const a = adata[j] * r0;
                const b = bdata[j] * r1;
                odata[j] = a + t * (b - a);
            }
        }
    }
}
