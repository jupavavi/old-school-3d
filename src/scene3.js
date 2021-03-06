import { mat4, vec3, vec4, quat } from "gl-matrix";
import createRenderer from "./renderer";
import vertexLitShader from "./renderer/shaders/vertex/vertexLit";
import basicTextFrag from "./renderer/shaders/frag/baseTexture";
import Mesh from "./engine/Mesh";
import { TO_RAD } from "./engine/utils";
import Transform, { Space } from "./engine/Transform";
import { map256TextToColor } from "./palette256";
import earthTexture from "./textures/earth";
import moonTexture from "./textures/moon";
import iceTexture from "./textures/ice";

const createRendererWithLights = (ctx) => {
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

    renderer.render = (...args) => {
        const { viewMatrix } = renderer;
        transformedLights = lights.map(({ position, spotDirection, ...light }) => {
            light.position = vec4.transformMat4([], position, viewMatrix);
            if (spotDirection) {
                light.spotDirection = vec4.transformMat4([], spotDirection, viewMatrix);
            }
            return light;
        });

        renderer.uniforms = { ...renderer.uniforms, lights: transformedLights };

        orgRenderFn.call(renderer, ...args);
    };

    return renderer;
};

const createObject3d = ({
    mesh,
    vertexShader,
    fragShader,
    uniforms,
}) => {
    const transform = new Transform();

    return {
        transform,
        uniforms,
        render(renderer) {
            transform.getLocalToWorldMatrix(renderer.modelMatrix);
            renderer.uniforms = uniforms;
            renderer.vertexShader = vertexShader;
            renderer.fragShader = fragShader;

            renderer.render(mesh);
        },
    };
};

export default function(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRendererWithLights(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();

    const earth = createObject3d({
        mesh: Mesh.createIcosphere(0.5, 2),
        vertexShader: vertexLitShader,
        fragShader: basicTextFrag,
        uniforms: {
            diffuse: [1, 1, 1, 1],
            specular: [1, 1, 1],
            shineness: 40,
            textScale: 1,
            text1: {
                width: earthTexture[0],
                height: earthTexture[1],
                data: map256TextToColor(earthTexture, 2),
            },
        },
    });

    const moon = createObject3d({
        mesh: Mesh.createIcosphere(0.2, 2),
        vertexShader: vertexLitShader,
        fragShader: basicTextFrag,
        uniforms: {
            diffuse: [1, 1, 1, 1],
            specular: [1, 1, 1],
            emission: [0.2, 0.2, 0.2],
            shineness: 1,
            textScale: 3,
            text1: {
                width: moonTexture[0],
                height: moonTexture[1],
                data: map256TextToColor(moonTexture, 2),
            },
        },
    });

    const asteroid = createObject3d({
        mesh: Mesh.createIcosphere(0.1, 1),
        vertexShader: vertexLitShader,
        fragShader: basicTextFrag,
        uniforms: {
            diffuse: [0.4, 0.7, 0.8, 1],
            specular: [1, 1, 1],
            emission: [0.2, 0.35, 0.4],
            shineness: 50,
            textScale: 2,
            text1: {
                width: iceTexture[0],
                height: iceTexture[1],
                data: map256TextToColor(iceTexture, 2),
            },
        },
    });

    earth.transform.setPosition([0, 0, 0]);
    earth.transform.rotateByQuat(quat.fromEuler([0, 0, 0, 1], 0, 0, 23.5));
    moon.transform.parent = earth.transform;
    moon.transform.setLocalPosition([1.25, 0, 0]);
    asteroid.transform.parent = moon.transform;
    asteroid.transform.setLocalPosition([0.5, 0, 0]);

    const rotationInc1 = quat.fromEuler([0, 0, 0, 1], 0, 0.5, 0);
    const rotationInc2 = quat.fromEuler([0, 0, 0, 1], 0, -2, 0);
    const rotationInc3 = quat.fromEuler([0, 0, 0, 1], 0, -0.5, -0.5);

    const lights = [
        { position: [0, 0.7, 1, 0], color: [1, 1, 1] },
    ];
    lights.forEach((ligth) => vec3.normalize(ligth.position, ligth.position));

    // renderer.viewport = { x: 0.25, y: 0.25, width: 0.5, height: 0.25 };

    return {
        resize({ width, height }) {
            const aspect = width / height;
            mat4.perspective(projectionMatrix, 60 * TO_RAD, aspect, 0.5, 100);
            renderer.projectionMatrix = projectionMatrix;
            renderer.resize();
            //renderer.viewport = { x: 0.25, y: 0.25, width: 0.5 * aspect, height: 0.5 };
        },
        render({ time }) {
            renderer.clear();
    
            mat4.lookAt(viewMatrix, [0, 0, 2.5], [0, 0, 0], [0, 1, 0]);
            renderer.viewMatrix = viewMatrix;
            earth.transform.rotateByQuat(rotationInc1);
            moon.transform.rotateByQuat(rotationInc2, Space.local);
            asteroid.transform.rotateByQuat(rotationInc3, Space.local);
            earth.render(renderer);
            moon.render(renderer);
            asteroid.render(renderer);

            renderer.flush();
        },
    }
};
