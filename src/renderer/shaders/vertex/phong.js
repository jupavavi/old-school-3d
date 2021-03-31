import { vec2, vec3, vec4 } from "gl-matrix";

export default (varyings, attrs, uniforms) => {
    const { uv, normal, position } = attrs;
    const {
        normalMatrix,
        modelViewMatrix,
        pmvMatrix,
    } = uniforms;
    vec3.transformMat3(varyings.normal, normal, normalMatrix); // normal to camera-space-coords
    vec3.normalize(varyings.normal, varyings.normal);
    vec3.transformMat4(varyings.wPosition, position, modelViewMatrix); // position to camera-space-coords
    vec2.copy(varyings.uv, uv);
    vec4.set(varyings.position, position[0], position[1], position[2], 1);
    vec4.transformMat4(varyings.position, varyings.position, pmvMatrix);
};
