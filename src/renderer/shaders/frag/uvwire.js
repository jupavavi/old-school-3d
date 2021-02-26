//import { vec3 } from "gl-matrix";

const defaultUV = [0, 0];

export default ({ color, uv }, { textScale = 8, lineWidth = 0.01 }) => {
    const { 0: u, 1: v } = uv || defaultUV;
    const factor = textScale * lineWidth;
    const hf = factor * 0.5;
    const cu = Math.abs(u * textScale) + hf;
    const cv = Math.abs(v * textScale) + hf;
    const cui = cu | 0;
    const cvi = cv | 0;
    if (cu - cui < factor || cv - cvi < factor) {
        return color;
    }
    return null;
};
