import Varyings from "./Varyings";

export const LineClipOutcomes = {
    OUTSIDE  : 0, // 0000
    INSIDE   : 1, // 0001
    CLIPPED_0: 2, // 0010
    CLIPPED_1: 4, // 0100
};

/**
 * The clip is performed using the formula `d = p[3] - sign * p[comp];`
 * To clip againts near plane, for example, comp must be 2 and sign -1
 * 
 * @param {Array<Number>|Float32Array} p0 first point
 * @param {Array<Number>|Float32Array} p1 second point
 * @param {number} comp componet of each point to test against (0 for x, 1 for y and 2 for z)
 * @param {number} sign sign of the plane, must be -1 or 1
 *
 * @return {number} bitwize flags to indicate the operations performed
 */
export const clipLineAgainstViewPlane = (v0, v1, comp, sign) => {
    const { position: p0 } = v0;
    const { position: p1 } = v1;

    let d0 = p0[3] - sign * p0[comp];
    let d1 = p1[3] - sign * p1[comp];

    if ((0 >= d0 && 0 >= d1)) {
        return LineClipOutcomes.OUTSIDE;
    }

    let outcome = LineClipOutcomes.INSIDE;

    if (d0 <= 0) {
        // clip it out v0
        const t = d1 / (d1 - d0);
        v0.setInterpolation(v1, v0, t);
        outcome |= LineClipOutcomes.CLIPPED_0;
    } else if (d1 <= 0) {
        // clip it out v1
        const t = d0 / (d0 - d1);
        v1.setInterpolation(v0, v1, t);
        outcome |= LineClipOutcomes.CLIPPED_1;
    }

    return outcome;
};

export const clipPolygonAgainstViewPlane = (vertices, comp, sign) => {
    const out = [];
    const { length } = vertices;
    for(let i = 0; i < length; i += 1) {
        const tmp0 = new Varyings(vertices[i]);
        const tmp1 = new Varyings(vertices[(i + 1) % length]);

        let clipOutcome = clipLineAgainstViewPlane(tmp0, tmp1, comp, sign);

        // bitwize & is mean to be used
        if (clipOutcome & LineClipOutcomes.INSIDE) {
            out.push(tmp0);
            if (clipOutcome & LineClipOutcomes.CLIPPED_1) {
                out.push(tmp1);
            }
        }
    }
    return out;
};

export const clipLine = (v0, v1) => {
    let outcome = LineClipOutcomes.INSIDE;
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 2, -1) : outcome; // near
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 2,  1) : outcome; // far
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 0, -1) : outcome; // left
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 0,  1) : outcome; // right
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 1, -1) : outcome; // bottom
    outcome = outcome ? clipLineAgainstViewPlane(v0, v1, 1,  1) : outcome; // top
    return outcome;
};

export const checkTriangle = (p0, p1, p2) => {
    const { 0: x0, 1: y0, 2: z0, 3: w0 } = p0;
    const { 0: x1, 1: y1, 2: z1, 3: w1 } = p1;
    const { 0: x2, 1: y2, 2: z2, 3: w2 } = p2;

    const n0 = w0 + z0;
    const n1 = w1 + z1;
    const n2 = w2 + z2;
    const f0 = w0 - z0;
    const f1 = w1 - z1;
    const f2 = w2 - z2;

    const l0 = w0 + x0;
    const l1 = w1 + x1;
    const l2 = w2 + x2;
    const r0 = w0 - x0;
    const r1 = w1 - x1;
    const r2 = w2 - x2;

    const b0 = w0 + y0;
    const b1 = w1 + y1;
    const b2 = w2 + y2;
    const t0 = w0 - y0;
    const t1 = w1 - y1;
    const t2 = w2 - y2;

    // triangle is fully outside
    if (Math.max(n0, n1, n2) <= 0
     || Math.max(f0, f1, f2) <= 0
     || Math.max(l0, l1, l2) <= 0
     || Math.max(r0, r1, r2) <= 0
     || Math.max(b0, b1, b2) <= 0
     || Math.max(t0, t1, t2) <= 0
    ) return -1; // fully outside

    // triangle is fully inside
    if (Math.min(n0, n1, n2) > 0
     && Math.min(f0, f1, f2) > 0
     && Math.min(l0, l1, l2) > 0
     && Math.min(r0, r1, r2) > 0
     && Math.min(b0, b1, b2) > 0
     && Math.min(t0, t1, t2) > 0
    ) return 1;

    return 0;
};

export const clipTrangle = (v0, v1, v2) => {
    const checkingOutcome = checkTriangle(v0.position, v1.position, v2.position);
    if (checkingOutcome === -1) return [];
    if (checkingOutcome === 1) return [v0, v1, v2];

    let vertices = [v0, v1, v2];
    for (let p = 0; p < 6; p += 1) {
        const comp = (p / 2) | 0; // 0 for x, 1 for y and 2 for z
        const sign = ((p % 2) * -2) + 1; // alternates between -1 and 1
        vertices = clipPolygonAgainstViewPlane(vertices, comp, sign);
        if (vertices.length === 0) break;
    }
    return vertices;
};
