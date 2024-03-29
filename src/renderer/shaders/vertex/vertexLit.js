import { vec2, vec3, vec4 } from "gl-matrix";
import { phong, getTexture2DFrag } from "../utils";

export default (() => {
    // precolacted working data
    const tmpNormal = vec3.create();
    const tmpPosition = vec3.create();
    const tmpDiffuse = vec4.create();
    const cameraPosition = vec3.create(); // [0, 0, 0]
    const defaultSpecular = vec3.fromValues(1, 1, 1); // [0, 0, 0]

    return (varyings, attrs, uniforms) => {
        const { uv, normal, position } = attrs;
        const {
            diffuse,
            specular = defaultSpecular,
            shineness = 20,
            emission,
            ambient,
            normalMatrix,
            modelViewMatrix,
            pmvMatrix,
            lights,
            text1 = {},
            textScale = 1,
        } = uniforms;
        vec3.transformMat3(tmpNormal, normal, normalMatrix); // normal to camera-space-coords
        vec3.normalize(tmpNormal, tmpNormal);
        vec3.transformMat4(tmpPosition, position, modelViewMatrix); // position to camera-space-coords

        vec4.mul(tmpDiffuse, diffuse, getTexture2DFrag(text1, uv[0] * textScale, uv[1] * textScale));

        phong(varyings.color, cameraPosition, tmpPosition, tmpNormal, lights, specular, tmpDiffuse, shineness, emission, ambient);

        vec2.copy(varyings.uv, uv);

        vec4.set(varyings.position, position[0], position[1], position[2], 1);
        vec4.transformMat4(varyings.position, varyings.position, pmvMatrix);
    };
})();
