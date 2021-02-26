import { vec3, vec4 } from "gl-matrix";

export const clamp = (num, min, max) => Math.max(min, Math.min(num, max));

export const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
};

export const step = (edge, x) => x < edge ? 0 : 1;
export const lerp = (a, b, t) => a + t * (b - a);
export const clampVec3Comp = (out, vec, min, max) => {
    out[0] = clamp(vec[0], min, max);
    out[1] = clamp(vec[1], min, max);
    out[2] = clamp(vec[2], min, max);

    return out;
};

export const getTexture2DFrag = (text1, u, v) => {
    const { data, width = 0, height = 0 } = text1;
    let tx = ((width * u) | 0) % width;
    let ty = ((height * v) | 0) % height;

    tx = tx < 0 ? width + tx : tx;
    ty = ty < 0 ? height + ty : ty;

    return data?.[tx + ty * width] || [1, 1, 1, 1];
};

export const specularFn = (lightDirection, cameraPosition, point, normal, shineness = 20) => {
    let sx = lightDirection[0] + (cameraPosition[0] - point[0]);
    let sy = lightDirection[1] + (cameraPosition[1] - point[1]);
    let sz = lightDirection[2] + (cameraPosition[2] - point[2]);
    // normalize
    let sl = Math.hypot(sx, sy, sz);
    sx /= sl;
    sy /= sl;
    sz /= sl;

    const s = sx * normal[0] + sy * normal[1] + sz * normal[2];
    return Math.max(s, 0) ** shineness;
};

export const lambertFn = (lightDirection, normal) => Math.max(0, vec3.dot(lightDirection, normal));

export const attenFn = (lightDirection, distance, attenAttribs, spotDirection) => {
    const dp2 = distance * distance;
    const d = clamp(dp2 / attenAttribs[3], 0, 1);
    let atten = 1 / (1 + attenAttribs[2] * d);

    if (attenAttribs[0] > 0) {
        const clampedCosine = Math.max(0, -vec3.dot(lightDirection, spotDirection))
        if (clampedCosine < attenAttribs[0]) {
            return 0;
        } else {
            atten = atten * Math.pow(clampedCosine, attenAttribs[1]);
        }
    }

    return atten;
};

export const phong = (() => {
    const lightDirection = vec3.create();
    const tmpColor = vec3.create();
    const tmpSpecular = vec3.create();
    const defaultAtten = vec4.fromValues(-1, 1, 0, 1);
    const defaultSpotDir = vec4.fromValues(0, 0, -1, 0);
    const defaultEmission = vec3.fromValues(0, 0, 0);
    const defaultAmbient = vec3.fromValues(0, 0, 0);

    return (
        out,
        cameraPosition,
        position,
        normal,
        lights,
        specular,
        diffuse,
        shineness,
        emission = defaultEmission,
        ambient = defaultAmbient,
    ) => {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;

        for (let light of lights) {
            // light's position is provided in view-space-coords
            const {
                position: lightPosition,
                color: lightColor,
                atten: lightAttenAttrs = defaultAtten,
                spotDirection: lightSpotDirection = defaultSpotDir,
            } = light;
            const lw = lightPosition[3] || 0; // 0 for directional light, 1 positional light
            vec3.copy(lightDirection, lightPosition);
            
            lightDirection[0] = lightDirection[0] - (position[0] * lw);
            lightDirection[1] = lightDirection[1] - (position[1] * lw);
            lightDirection[2] = lightDirection[2] - (position[2] * lw);
            const dist = vec3.length(lightDirection);
            vec3.scale(lightDirection, lightDirection, 1 / dist); // normalize
    
            const diffuseFactor = lambertFn(lightDirection, normal);
            const atten = lw > 0
                ? attenFn(lightDirection, dist, lightAttenAttrs, lightSpotDirection)
                : 1; // 1 means no attenuation
                
            vec3.scale(tmpColor, lightColor, diffuseFactor);
            vec3.mul(tmpColor, tmpColor, diffuse);
            if (diffuseFactor > 0) {
                const specularFactor = specularFn(lightDirection, cameraPosition, position, normal, shineness);
                vec3.scale(tmpSpecular, specular, specularFactor);
                vec3.add(tmpColor, tmpColor, tmpSpecular);
            }

            out[0] = clamp(out[0] + tmpColor[0] * atten, 0, 1);
            out[1] = clamp(out[1] + tmpColor[1] * atten, 0, 1);
            out[2] = clamp(out[2] + tmpColor[2] * atten, 0, 1);
        }
        out[0] = clamp(out[0] + emission[0] + ambient[0], 0, 1);
        out[1] = clamp(out[1] + emission[1] + ambient[1], 0, 1);
        out[2] = clamp(out[2] + emission[2] + ambient[2], 0, 1);

        out[3] = diffuse[3];
        return out;
    };
})();


const E = 0.05;
export const celShade = (d, level) => {
    d *= level;
    const r = 1.0 / (level - 0.5);
    const fd = Math.floor(d);
    const dr = d * r;

    if (d > fd - E && d < fd + E) {
        const last = (fd - Math.sign(d - fd)) * r;
        return lerp(last, fd * r, smoothstep((fd - E) * r, (fd + E) * r, dr));
    }
    return fd * r;
};
export const specularCellShade = (sf) => (
    sf > 0.5 - E && sf < 0.5 + E
        ? smoothstep(0.5 - E, 0.5 + E, sf)
        : step(0.5, sf)
);

export const cel = (() => {
    const lightDirection = vec3.create();
    const tmpColor = vec3.create();
    const tmpSpecular = vec3.create();
    const defaultAtten = vec4.fromValues(-1, 1, 0, 1);
    const defaultSpotDir = vec4.fromValues(0, 0, -1, 0);
    const defaultEmission = vec3.fromValues(0, 0, 0);
    const defaultAmbient = vec3.fromValues(0, 0, 0);

    return (
        out,
        cameraPosition,
        position,
        normal,
        lights,
        specular,
        diffuse,
        shineness,
        emission = defaultEmission,
        ambient = defaultAmbient,
        cellLevel = 4,
    ) => {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;

        for (let light of lights) {
            // light's position is provided in view-space-coords
            const {
                position: lightPosition,
                color: lightColor,
                atten: lightAttenAttrs = defaultAtten,
                spotDirection: lightSpotDirection = defaultSpotDir,
            } = light;
            const lw = lightPosition[3] || 0; // 0 for directional light, 1 positional light
            vec3.copy(lightDirection, lightPosition);
            
            lightDirection[0] = lightDirection[0] - (position[0] * lw);
            lightDirection[1] = lightDirection[1] - (position[1] * lw);
            lightDirection[2] = lightDirection[2] - (position[2] * lw);
            const dist = vec3.length(lightDirection);
            vec3.scale(lightDirection, lightDirection, 1 / dist); // normalize
    
            const diffuseFactor = lambertFn(lightDirection, normal);
            const atten = lw > 0
                ? attenFn(lightDirection, dist, lightAttenAttrs, lightSpotDirection)
                : 1; // 1 means no attenuation
                
            vec3.scale(tmpColor, lightColor, celShade(diffuseFactor * atten, cellLevel));
            vec3.mul(tmpColor, tmpColor, diffuse);
            if (diffuseFactor > 0) {
                const specularFactor = specularFn(lightDirection, cameraPosition, position, normal, shineness);
                vec3.scale(tmpSpecular, specular, specularCellShade(specularFactor * atten));
                vec3.add(tmpColor, tmpColor, tmpSpecular);
            }

            out[0] = clamp(out[0] + tmpColor[0], 0, 1);
            out[1] = clamp(out[1] + tmpColor[1], 0, 1);
            out[2] = clamp(out[2] + tmpColor[2], 0, 1);
        }
        out[0] = clamp(out[0] + emission[0] + ambient[0], 0, 1);
        out[1] = clamp(out[1] + emission[1] + ambient[1], 0, 1);
        out[2] = clamp(out[2] + emission[2] + ambient[2], 0, 1);

        out[3] = diffuse[3];
        return out;
    };
})();