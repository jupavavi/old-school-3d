import { clamp } from "./utils";

export const blendFunctionsRGB = {
    zero: (out) => {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        return out;
    },
    one: (out, color) => {
        out[0] = color[0];
        out[1] = color[1];
        out[2] = color[2];
        return out;
    },
    srcColor: (out, color, src) => {
        out[0] = color[0] * src[0];
        out[1] = color[1] * src[1];
        out[2] = color[2] * src[2];
        return out;
    },
    oneMinusSrcColor: (out, color, src) => {
        out[0] = color[0] * (1 - src[0]);
        out[1] = color[1] * (1 - src[1]);
        out[2] = color[2] * (1 - src[2]);
        return out;
    },
    dstColor: (out, color, src, dst) => {
        out[0] = color[0] * dst[0];
        out[1] = color[1] * dst[1];
        out[2] = color[2] * dst[2];
        return out;
    },
    oneMinusDstColor: (out, color, src, dst) => {
        out[0] = color[0] * (1 - dst[0]);
        out[1] = color[1] * (1 - dst[1]);
        out[2] = color[2] * (1 - dst[2]);
        return out;
    },
    srcAlpha: (out, color, src) => {
        out[0] = color[0] * src[3];
        out[1] = color[1] * src[3];
        out[2] = color[2] * src[3];
        return out;
    },
    oneMinusSrcAlpha: (out, color, src) => {
        out[0] = color[0] * (1 - src[3]);
        out[1] = color[1] * (1 - src[3]);
        out[2] = color[2] * (1 - src[3]);
        return out;
    },
    dstAlpha: (out, color, src, dst) => {
        out[0] = color[0] * dst[3];
        out[1] = color[1] * dst[3];
        out[2] = color[2] * dst[3];
        return out;
    },
    oneMinusDstAlpha: (out, color, src, dst) => {
        out[0] = color[0] * (1 - dst[3]);
        out[1] = color[1] * (1 - dst[3]);
        out[2] = color[2] * (1 - dst[3]);
        return out;
    },
    constantColor: (out, color, src, dst, cst) => {
        out[0] = color[0] * cst[0];
        out[1] = color[1] * cst[1];
        out[2] = color[2] * cst[2];
        return out;
    },
    oneMinusConstantColor: (out, color, src, dst, cst) => {
        out[0] = color[0] * (1 - cst[0]);
        out[1] = color[1] * (1 - cst[1]);
        out[2] = color[2] * (1 - cst[2]);
        return out;
    },
    constantAlpha: (out, color, src, dst, cst) => {
        out[0] = color[0] * cst[3];
        out[1] = color[1] * cst[3];
        out[2] = color[2] * cst[3];
        return out;
    },
    oneMinusConstantAlpha: (out, color, src, dst, cst) => {
        out[0] = color[0] * (1 - cst[3]);
        out[1] = color[1] * (1 - cst[3]);
        out[2] = color[2] * (1 - cst[3]);
        return out;
    },
};

export const blendFunctionsAlpha = {
    zero: (out) => {
        out[3] = 0;
        return out;
    },
    one: (out, color) => {
        out[3] = color[3];
        return out;
    },
    srcColor: (out, color, src) => {
        out[3] = color[3] * src[3];
        return out;
    },
    oneMinusSrcColor: (out, color, src) => {
        out[3] = color[3] * (1 - src[3]);
        return out;
    },
    dstColor: (out, color, src, dst) => {
        out[3] = color[3] * dst[3];
        return out;
    },
    oneMinusDstColor: (out, color, src, dst) => {
        out[3] = color[3] * (1 - dst[3]);
        return out;
    },
    srcAlpha: (out, color, src) => {
        out[3] = color[3] * src[3];
        return out;
    },
    oneMinusSrcAlpha: (out, color, src) => {
        out[3] = color[3] * (1 - src[3]);
        return out;
    },
    dstAlpha: (out, color, src, dst) => {
        out[3] = color[3] * dst[3];
        return out;
    },
    oneMinusDstAlpha: (out, color, src, dst) => {
        out[3] = color[3] * (1 - dst[3]);
        return out;
    },
    constantColor: (out, color, src, dst, cst) => {
        out[3] = color[3] * cst[3];
        return out;
    },
    oneMinusConstantColor: (out, color, src, dst, cst) => {
        out[3] = color[3] * (1 - cst[3]);
        return out;
    },
    constantAlpha: (out, color, src, dst, cst) => {
        out[3] = color[3] * cst[3];
        return out;
    },
    oneMinusConstantAlpha: (out, color, src, dst, cst) => {
        out[3] = color[3] * (1 - cst[3]);
        return out;
    },
};


export const blendEquationsRGB = {
    add: (out, a, b) => {
        out[0] = clamp(a[0] + b[0], 0, 1);
        out[1] = clamp(a[1] + b[1], 0, 1);
        out[2] = clamp(a[2] + b[2], 0, 1);
        return out;
    },
    sub: (out, a, b) => {
        out[0] = clamp(a[0] - b[0], 0, 1);
        out[1] = clamp(a[1] - b[1], 0, 1);
        out[2] = clamp(a[2] - b[2], 0, 1);
        return out;
    },
    invSub: (out, a, b) => {
        out[0] = clamp(b[0] - a[0], 0, 1);
        out[1] = clamp(b[1] - a[1], 0, 1);
        out[2] = clamp(b[2] - a[2], 0, 1);
        return out;
    },
    min: (out, a, b) => {
        out[0] = Math.min(a[0], b[0]);
        out[1] = Math.min(a[1], b[1]);
        out[2] = Math.min(a[2], b[2]);
        return out;
    },
    max: (out, a, b) => {
        out[0] = Math.max(a[0], b[0]);
        out[1] = Math.max(a[1], b[1]);
        out[2] = Math.max(a[2], b[2]);
        return out;
    },
};

export const blendEquationsAlpha = {
    add: (out, a, b) => {
        out[3] = clamp(a[3] + b[3], 0, 1);
        return out;
    },
    sub: (out, a, b) => {
        out[3] = clamp(a[3] - b[3], 0, 1);
        return out;
    },
    invSub: (out, a, b) => {
        out[3] = clamp(b[3] - a[3], 0, 1);
        return out;
    },
    min: (out, a, b) => {
        out[3] = Math.min(a[3], b[3]);
        return out;
    },
    max: (out, a, b) => {
        out[3] = Math.max(a[3], b[3]);
        return out;
    },
};
