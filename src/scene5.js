import { mat4, vec3, vec4, quat } from "gl-matrix";
import createRenderer from "./renderer";
import vertexLitShader from "./renderer/shaders/vertex/vertexLit";
import defaultFragShader from "./renderer/shaders/frag/default";
import Mesh from "./engine/Mesh";
import { TO_RAD } from "./engine/utils";
import Transform from "./engine/Transform";

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
    meshBuffer,
    vertexShader,
    fragShader,
    uniforms,
}) => {
    const transform = new Transform();

    return {
        transform,
        uniforms,
        render(renderer) {
            renderer.modelMatrix = transform.localToWorldMatrix;
            renderer.uniforms = uniforms;
            renderer.vertexShader = vertexShader;
            renderer.fragShader = fragShader;

            renderer.render(meshBuffer);
        },
    };
};

export default function(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRendererWithLights(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();

    const sphere = Mesh.createIcosphere(0.5, 3);
    const meshBuffer = sphere.createBuffer();

    const earth = createObject3d({
        meshBuffer,
        vertexShader: vertexLitShader,
        fragShader: defaultFragShader,
        uniforms: {
            diffuse: [1, 0, 0, .5],
            specular: [1, 1, 1],
            shineness: 40,
            textScale: 1,
        },
    });

    const moon = createObject3d({
        meshBuffer,
        vertexShader: vertexLitShader,
        fragShader: defaultFragShader,
        uniforms: {
            diffuse: [0, 1, 0, .25],
            specular: [1, 1, 1],
            emission: [0.2, 0.2, 0.2],
            shineness: 10,
            textScale: 3,
        },
    });

    const asteroid = createObject3d({
        meshBuffer,
        vertexShader: vertexLitShader,
        fragShader: defaultFragShader,
        uniforms: {
            diffuse: [0, 0, 1, 0.3],
            specular: [1, 1, 1],
            emission: [0.2, 0.35, 0.4],
            shineness: 50,
            textScale: 2,
        },
    });

    earth.transform.position = [0, 0, 0];
    earth.transform.rotation = quat.fromEuler([0, 0, 0, 1], 0, 0, 23.5);
    moon.transform.parent = earth.transform;
    moon.transform.localScale = [0.4, 0.4, 0.4];
    moon.transform.localPosition = [1.25, 0, 0];
    asteroid.transform.parent = moon.transform;
    asteroid.transform.localScale = [0.5, 0.5, 0.5];
    asteroid.transform.localPosition = [1, 0, 0];

    const rotationInc1 = quat.fromEuler([0, 0, 0, 1], 0, 0.5, 0);
    const rotationInc2 = quat.fromEuler([0, 0, 0, 1], 0, -2, 0);
    const rotationInc3 = quat.fromEuler([0, 0, 0, 1], 0, -0.5, -0.5);

    const objects = [earth, moon, asteroid];

    const lights = [
        { position: [0, 0.7, 1, 0], color: [1, 1, 1] },
    ];
    lights.forEach((ligth) => vec3.normalize(ligth.position, ligth.position));

    renderer.blendEnabled = true;
    renderer.blendSrcFunctionRGBA = "srcAlpha";
    renderer.blendDstFunctionRGBA = "oneMinusSrcAlpha";
    renderer.depthWriteEnabled = false;

    const camPosition = [0, 0, 2.5];
    const sorter = (a, b) => {
        return vec3.sqrDist(camPosition, b.transform.position) - vec3.sqrDist(camPosition, a.transform.position);
    };
    const forEachRender = obj => obj.render(renderer);

    return {
        resize({ width, height }) {
            const aspect = width / height;
            mat4.perspective(projectionMatrix, 60 * TO_RAD, aspect, 0.5, 100);
            renderer.projectionMatrix = projectionMatrix;
            renderer.resize();
            // renderer.viewport = { x: 0.25, y: 0.25, width: 0.5 * aspect, height: 0.5 };
        },
        render({ time }) {
            renderer.clear();
    
            mat4.lookAt(viewMatrix, camPosition, [0, 0, 0], [0, 1, 0]);
            renderer.viewMatrix = viewMatrix;
            earth.transform.rotateByQuat(rotationInc1);
            moon.transform.rotateLocallyByQuat(rotationInc2);
            asteroid.transform.rotateLocallyByQuat(rotationInc3);

            objects.sort(sorter);

            renderer.cullFace = 1;
            objects.forEach(forEachRender);
            renderer.cullFace = -1;
            objects.forEach(forEachRender);

            renderer.flush();
        },
    };
};
