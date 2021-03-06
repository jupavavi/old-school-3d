import { mat4, vec3 } from "gl-matrix";
import createRenderer from "./renderer";
import phongVertexShader from "./renderer/shaders/vertex/phong";
import phongFragShader from "./renderer/shaders/frag/phong";
import Mesh from "./engine/Mesh";
import { TO_RAD } from "./engine/utils";

export default function(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRenderer(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();

    const box = Mesh.createBox(1, 1, 1);

    const lights = [
        { position: [0, 1, 1, 0], color: [1, 1, 1] },
        { position: [0, 0, 1, 1], color: [1, 1, 1], atten: [0, 0, 0.1, 5] },
    ];
    lights.forEach((ligth) => vec3.normalize(ligth.position, ligth.position));

    const uniforms = {
        diffuse: [0, 1, 1, 1],
        specular: [1, 1, 1, 1],
        shineness: 50,
        lights,
        textScale: 8,
    };

    let angle = 0;

    return {
        resize({ width, height }) {
            const aspect = width / height;
            mat4.perspective(projectionMatrix, 60 * TO_RAD, aspect, 0.5, 100);
            renderer.projectionMatrix = projectionMatrix;
            renderer.resize();
        },
        render({ time }) {
            renderer.clear();
    
            mat4.lookAt(viewMatrix, [0, 0, 2], [0, 0, 0], [0, 1, 0]);
            renderer.viewMatrix = viewMatrix;

            angle += 35 * TO_RAD * time.deltaTime;
            mat4.fromTranslation(modelMatrix, [0, 0, 0]);
            mat4.rotate(modelMatrix, modelMatrix, angle, [-1, 1, -1]);
            renderer.modelMatrix = modelMatrix;
            renderer.uniforms = uniforms;
            renderer.vertexShader = phongVertexShader;
            renderer.fragShader = phongFragShader;

            renderer.render(box);

            renderer.flush();
        },
    }
};