import { vec3, vec4 } from "gl-matrix";
import { cel, getTexture2DFrag } from "../utils";

export default (() =>{
    const tmpDiffuse = vec4.create();
    const cameraPosition = vec3.create(); // [0, 0, 0]
    const defaultSpecular = vec3.fromValues(1, 1, 1); // [0, 0, 0]
    return ({ color, normal, wPosition, uv }, uniforms) => {
        const {
            diffuse,
            specular = defaultSpecular,
            shineness = 20,
            emission,
            ambient,
            lights,
            text1 = {},
            textScale = 1
        } = uniforms;
        const texsel = getTexture2DFrag(text1, uv[0] * textScale, uv[1] * textScale);
        vec4.mul(tmpDiffuse, diffuse, texsel);

        cel(color, cameraPosition, wPosition, normal, lights, specular, tmpDiffuse, shineness, emission, ambient);

        return color;
    };
})();