import { vec3 } from "gl-matrix";

const defaultUV = [0, 0];

export default ({ color, uv }, { textScale = 8 }) => {
    const { 0: u, 1: v } = uv || defaultUV;
    const cu = (u * textScale) | 0;
    const cv = (v * textScale) | 0;
    const c = cu + cv;
    if (c % 2 === 0) {
        return vec3.scale(color, color, 0.1);
    }
    return color;
};
