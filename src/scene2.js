import { mat4, vec3 } from "gl-matrix";
import createRenderer from "./renderer";
import phongVertexShader from "./renderer/shaders/vertex/vertexLit";
import phongFragShader from "./renderer/shaders/frag/baseTexture";
import Mesh from "./engine/Mesh";
import { TO_RAD, getKnotPoint } from "./engine/utils";
import { map256TextToColor } from "./palette256";
import WallTex from "./textures/wall";

export default function (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRenderer(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();

    const knotAttrs = {
        q: 1,
        p: 3,
        size: 100,
        radius: 5,
        slices: 16,
        rings: 96,
    };
    const tunnel = Mesh.createKnot(
        knotAttrs.q,
        knotAttrs.p,
        knotAttrs.size,
        knotAttrs.radius,
        knotAttrs.slices,
        knotAttrs.rings,
    );

    const lightRange = 150;
    const lightRangeSqr = lightRange * lightRange;

    const lights = [
        {
            position: [0, 0, 0, 1],
            color: [1, 1, 1],
            atten: [0.85, 10, lightRangeSqr, lightRangeSqr * lightRangeSqr],
            spotDirection: [0, 0, -1, 0],
        },
    ];
    tunnel.normal.forEach((n) => vec3.negate(n, n));
    
    const meshBuffer = tunnel.createBuffer();

    const uniforms = {
        diffuse: [1, 1, 1, 1],
        specular: [1, 1, 1, 1],
        shineness: 100,
        lights,
        textScale: 16,
        text1: {
            width: WallTex[0],
            height: WallTex[1],
            data: map256TextToColor(WallTex, 2),
        },
    };

    const up = vec3.create();
    const position = vec3.create();
    const nextPosition = vec3.create();
    vec3.set(up, 0, 1, 0);
    getKnotPoint(position, knotAttrs.q, knotAttrs.p, knotAttrs.size, 0);
    let t = 0;

    return {
        resize({ width, height }) {
            const aspect = width / height;
            mat4.perspective(projectionMatrix, 60 * TO_RAD, aspect, 0.5, 50);
            renderer.projectionMatrix = projectionMatrix;
            renderer.resize();
        },
        render({ time, keys }) {
            renderer.clear();

            t += time.deltaTime * 0.1;
    
            getKnotPoint(
                nextPosition,
                knotAttrs.q,
                knotAttrs.p,
                knotAttrs.size,
                t,
            );
            mat4.lookAt(viewMatrix, position, nextPosition, up);
            
            vec3.copy(position, nextPosition);
            //vec3.copy(lights[0].position, nextPosition);
            // lights[0].position[3] = 1;
            renderer.viewMatrix = viewMatrix;

            renderer.modelMatrix = modelMatrix;
            renderer.uniforms = uniforms;
            renderer.vertexShader = phongVertexShader;
            renderer.fragShader = phongFragShader;
            renderer.cullFace = 1;

            renderer.render(meshBuffer);

            renderer.flush();
        },
    };
};