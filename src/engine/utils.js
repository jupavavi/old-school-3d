import { vec3 } from "gl-matrix";

export const TO_RAD = Math.PI / 180;

export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const clamp = (num, min, max) => Math.max(min, Math.min(num, max));

/**
 * Computes the normal from 3 points. If vec4 is passed, vec4[3] won't be altered.
 *
 * @param {vec3|vec4} out the receiving vector
 * @param {ReadonlyVec3} p1 the first point
 * @param {ReadonlyVec3} p2 the second point
 * @param {ReadonlyVec3} p3 the third point
 * @returns {vec3|vec4} out
 */
export const normalFrom3Points = (out, p1, p2, p3) => {
    // a = p1 - p2
    // b = p3 - p2
    const ax = p2[0] - p1[0];
    const ay = p2[1] - p1[1];
    const az = p2[2] - p1[2];
    const bx = p3[0] - p2[0];
    const by = p3[1] - p2[1];
    const bz = p3[2] - p2[2];

    // out = a x b;
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;

    return vec3.normalize(out, out);
};

/**
 * Gets plane from 3 points.
 * The result will be stored in the receiving vector as [nx, ny, nz, d], where nx, ny and nz
 * are the normal components and d is the distance from the origin.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec3} p1 the first point
 * @param {ReadonlyVec3} p2 the second point
 * @param {ReadonlyVec3} p3 the third point
 * @returns {vec4} out
 */
export const planeFrom3Points = (out, p1, p2, p3) => {
    normalFrom3Points(out, p1, p2, p3);
    out[3] = -vec3.dot(out, p2);
    // out = [nx, ny, nz, d]
    return out;
};

/**
 * Computes the avg of 3 vecs. Useful for finding middle point of a triangle.
 *
 * @param {vec3|vec4} out the receiving vector
 * @param {ReadonlyVec3} p1 the first point
 * @param {ReadonlyVec3} p2 the second point
 * @param {ReadonlyVec3} p3 the third point
 * @returns {vec3|vec4} out
 */
export const avgComponents = (out, p1, p2, p3) => {
    out[0] = (p1[0] + p2[0] + p3[0]) / 3;
    out[1] = (p1[1] + p2[1] + p3[1]) / 3;
    out[2] = (p1[2] + p2[2] + p3[2]) / 3;
    if (out.length === 4) {
        out[3] = ((p1[3] + p2[3] + p3[3]) / 3) || 0;
    }

    return out;
};

export const lerpClamped = (a, b, t) => (b - a) * clamp(t, 0, 1) + a;
export const lerp = (a, b, t) => a + t * (b - a);
export const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
};

export const getKnotPoint = (out, q, p, size = 1, t) => {
    const alpha = t;

    out[0] = Math.cos(q * alpha) * (3 + Math.cos(p * alpha)) * size * 0.25;
    out[1] = Math.sin(q * alpha) * (3 + Math.cos(p * alpha)) * size * 0.25;
    out[2] = Math.sin(p * alpha) * size * 0.25;

    return out;
};

export const createKnotCurve = (q, p, size = 1, divisions = 10) => {
    const alphaInc = Math.PI * 2 / divisions;
    let alpha = 0;
    const curve = Array(divisions + 1);

    for (let i = 0; i <= divisions; i++) {
        curve[i] = getKnotPoint([], q, p, size, alpha);
        alpha += alphaInc;
    }
    return curve;
};

export const isFrontFace = (pp0, pp1, pp2) => {
    const { 0: x0, 1: y0 } = pp0;
    const { 0: x1, 1: y1 } = pp1;
    const { 0: x2, 1: y2 } = pp2;
    return (
        x0 * y1 - x1 * y0 +
        x1 * y2 - x2 * y1 +
        x2 * y0 - x0 * y2
    ) > 0
};

export const numberToDefault = (value, fallback = 0) => (
    Number.isNaN(value * 1) ? fallback : value
);

export const saveCopyVec2 = (out, vector) => {
    out[0] = numberToDefault(vector?.[0]);
    out[1] = numberToDefault(vector?.[1]);

    return out;
};

export const saveCopyVec3 = (out, vector) => {
    out[0] = numberToDefault(vector?.[0]);
    out[1] = numberToDefault(vector?.[1]);
    out[2] = numberToDefault(vector?.[2]);

    return out;
};

export const saveCopyVec4 = (out, vector) => {
    out[0] = numberToDefault(vector?.[0]);
    out[1] = numberToDefault(vector?.[1]);
    out[2] = numberToDefault(vector?.[2]);
    out[3] = numberToDefault(vector?.[3]);

    return out;
};