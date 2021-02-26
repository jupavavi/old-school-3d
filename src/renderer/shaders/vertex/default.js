import { vec4 } from "gl-matrix";

export default (out, { position, uv }, { diffuse = [1, 1, 1, 1], pmvMatrix }) => {
    out.uv = uv;
    vec4.set(out.position, position[0], position[1], position[2], 1);
    vec4.transformMat4(out.position, out.position, pmvMatrix);
    vec4.copy(out.color, diffuse);
};
