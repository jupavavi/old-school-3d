import { vec3, vec4 } from "gl-matrix";
import { clamp, clampVec3Comp, phong, getTexture2DFrag } from "../utils";

const translatePoint = (out, position, normal, speed, time, intensity, d) => {
    out[0] = (Math.sin(speed * time * d) * intensity * normal[0]) + position[0];
    out[1] = (Math.cos(speed * time * d) * intensity * normal[1]) + position[1];
    out[2] = (Math.sin(speed * time * d) * intensity * normal[2]) + position[2];

    return out;
};

export default (() => {
    const tmpNormal = vec3.create();
    const tmpPosition = vec3.create();
    const tmpDiffuse = vec4.create();
    const tmpAcc = vec3.create();
    const cameraPosition = vec3.create(); // [0, 0, 0]
    const defaultSpecular = vec3.fromValues(1, 1, 1); // [0, 0, 0]

    const ref1 = vec3.create();
    const ref2 = vec3.create();

    return (out, attrs, uniforms) => {
        const { position, normal, uv } = attrs;
        const {
            time,
            intensity = 0.02,
            speed = 2,
            textScale,
            diffuse,
            specular = defaultSpecular,
            shineness = 20,
            emission,
            ambient,
            normalMatrix,
            modelViewMatrix,
            projectionMatrix,
            pmvMatrix,
            lights,
            text1 = {},
        } = uniforms;
        let { 0: u, 1: v } = uv;
        u = (u * textScale) % textScale;
        v = (v * textScale) % textScale;
        const d = Math.hypot(u, v);

        translatePoint(tmpPosition, position, normal, speed, time, intensity, d);

        vec3.sub(ref1, position, tmpPosition);
        // const dot = Math.sign(vec3.dot(ref1, normal));
        const len = (intensity / vec3.length(ref1));

        vec3.transformMat3(tmpNormal, normal, normalMatrix); // normal to camera-space-coords
        vec3.normalize(tmpNormal, tmpNormal);
        vec3.transformMat4(tmpPosition, tmpPosition, modelViewMatrix); // position to camera-space-coords
        vec3.set(tmpAcc, 0, 0, 0);
        vec4.copy(tmpDiffuse, getTexture2DFrag(text1, uv[0] * textScale, uv[1] * textScale));

        vec4.mul(tmpDiffuse, diffuse, tmpDiffuse);

        phong(out.color, cameraPosition, tmpPosition, tmpNormal, lights, specular, tmpDiffuse, shineness, emission, ambient);
        vec3.scale(out.color, out.color, len);
        clampVec3Comp(out.color, out.color, 0, 1);

        out.uv = uv;

        vec4.set(out.position, tmpPosition[0], tmpPosition[1], tmpPosition[2], 1);
        vec4.transformMat4(out.position, out.position, projectionMatrix);
    };
})();
