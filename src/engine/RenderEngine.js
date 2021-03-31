import { vec4 } from "gl-matrix";

import createRenderer from "../renderer";

export default (ctx) => {
    let lights = [
        { position: [0, 0.7071, 0.7071, 0], color: [1, 1, 1] },
    ];
    let transformedLights = [];

    const renderer = createRenderer(ctx);
    const { render: orgRenderFn } = renderer;

    Object.defineProperty(renderer, "lights", {
        get() { return lights },
        set(value) { lights = value },
    });

    renderer.render = function(...args) {
        const { viewMatrix } = renderer;
        transformedLights = lights.map(({ position, spotDirection, ...light }) => {
            light.position = vec4.transformMat4([], position, viewMatrix);
            if (spotDirection) {
                light.spotDirection = vec4.transformMat4([], spotDirection, viewMatrix);
            }
            return light;
        });

        renderer.uniforms = { ...renderer.uniforms, lights: transformedLights };

        orgRenderFn.call(this, ...args);
    };

    return renderer;
};
