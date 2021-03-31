import { mat4, vec3, vec4 } from "gl-matrix";
import createRenderer from "./renderer";
import phongVertexShader from "./renderer/shaders/vertex/phong";
import defaultFragShader from "./renderer/shaders/frag/default";
import celFragShader from "./renderer/shaders/frag/cel";
import Mesh from "./engine/Mesh";
import { TO_RAD } from "./engine/utils";

const outlineVertexShader = (out, attrs, uniforms) => {
    const { position, normal } = attrs;
    const { lineWidth = 0.02, pmvMatrix, lineColor = [0, 0, 0] } = uniforms;

    out.position[3] = 1;
    vec3.scale(out.position, normal, lineWidth);
    vec3.add(out.position, out.position, position);
    vec4.transformMat4(out.position, out.position, pmvMatrix);
    vec4.set(out.color, lineColor[0], lineColor[1], lineColor[2], 1);

    return out;
};


export default function(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRenderer(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();

    //const model = Mesh.loadOBJ(tigerObj, 0.002);
    // model.calculateNormals();
    const model = Mesh.createKnot(2, 5, 0.75, 0.15, 8, 48);
    const meshBuffer = model.createBuffer();

    const lights = [
        { position: [0, 1, 1, 0], color: [1, 1, 1] },
        { position: [0, 0, 1, 1], color: [1, 1, 1], atten: [0, 0, 0.1, 5] },
    ];
    lights.forEach((ligth) => vec3.normalize(ligth.position, ligth.position));

    const outlineUniforms = {
        lineColor: [0, 0, 0],
        lineWidth: 0.01,
    };
    const uniforms = {
        diffuse: [0, 1, 1, 1],
        specular: [1, 1, 1, 1],
        shineness: 20,
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
            mat4.rotate(modelMatrix, modelMatrix, angle, [0, 1, 0]);
            renderer.modelMatrix = modelMatrix;
            renderer.uniforms = uniforms;
            renderer.vertexShader = phongVertexShader;
            renderer.fragShader = celFragShader;
            renderer.cullFace = -1;
            renderer.render(meshBuffer);

            // outline
            mat4.fromTranslation(modelMatrix, [0, 0, 0]);
            mat4.rotate(modelMatrix, modelMatrix, angle, [0, 1, 0]);
            mat4.scale(modelMatrix, modelMatrix, [1.01, 1.01, 1.01]);
            renderer.modelMatrix = modelMatrix;
            renderer.vertexShader = outlineVertexShader;
            renderer.fragShader = defaultFragShader;
            renderer.uniforms = outlineUniforms;
            renderer.cullFace = 1;
            renderer.render(meshBuffer);

            renderer.flush();
        },
    };
};