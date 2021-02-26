import { vec3, vec4 } from "gl-matrix";

export default (out, attrs, uniforms) => {
    const { uv, normal, position } = attrs;
    const {
        normalMatrix,
        modelViewMatrix,
        pmvMatrix,
    } = uniforms;
    out.normal = vec3.transformMat3([], normal, normalMatrix); // normal to camera-space-coords
    vec3.normalize(out.normal, out.normal);
    out.vPosition = vec3.transformMat4([], position, modelViewMatrix); // position to camera-space-coords
    out.uv = uv;
    vec4.set(out.position, position[0], position[1], position[2], 1);
    vec4.transformMat4(out.position, out.position, pmvMatrix);
};
