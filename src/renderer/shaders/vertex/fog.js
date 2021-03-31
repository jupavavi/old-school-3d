import { vec3, vec4 } from "gl-matrix";

const FOG_FUNC = {
    linear: ({ fogEnd, fogStart }, d) => Math.min(1, Math.max(0, (fogEnd - d) / (fogEnd - fogStart))),
    exp: ({ fogDensity }, d) => 1 / Math.exp(d * fogDensity),
    exp2: ({ fogDensity }, d) => {
        const e = d * fogDensity;
        return 1 / Math.exp(e * e);
    },
};

export default (varyings, attrs, uniforms) => {
    const { position, fogColor, fogType = "linear" } = attrs;

    vec4.set(varyings.position, position[0], position[1], position[2], 1);

    const { modelView, projectionMatrix } = uniforms;
    vec4.transformMat4(varyings.position, position, modelView);
    const fogFactor = FOG_FUNC[fogType]?.(attrs, -varyings.position[2]);
    vec3.lerp(varyings.color, fogColor, varyings.color, Number.isNaN(fogFactor) ? 0 : fogFactor);

    vec4.transformMat4(varyings.position, varyings.position, projectionMatrix);
};
