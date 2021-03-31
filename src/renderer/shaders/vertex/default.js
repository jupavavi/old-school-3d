import { vec2, vec4 } from "gl-matrix";

export default (varyings, { position, uv }, { diffuse = [1, 1, 1, 1], pmvMatrix }) => {
    vec2.copy(varyings.uv, uv);
    vec4.set(varyings.position, position[0], position[1], position[2], 1);
    vec4.transformMat4(varyings.position, varyings.position, pmvMatrix);
    vec4.copy(varyings.color, diffuse);
};
