import { mat4, vec3 } from "gl-matrix";
import "./gameCanvas.css";
import Mesh from "./Mesh";
import { TO_RAD } from "./utils";
import createRenderer from "./renderer";
import checkersFragShader from "./renderer/shaders/frag/checkers";
import defaultFragShader from "./renderer/shaders/frag/default";
import vertexLitShader from "./renderer/shaders/vertex/vertexLit";
import { map256TextToColor } from "./palette256";
import waterShader from "./renderer/shaders/vertex/water";
import WallTex from "./textures/wall";

export default function(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const renderer = createRenderer(ctx);
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    
    const mesh = new Mesh({
        vertices: [
            [-100,  0, -100],
            [-100,  0,  100],
            [ 100,  0,  100],
            [ 100,  0, -100],
        ],
        normal: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ],
        uv: [
            [-1, -1],
            [-1,  1],
            [ 1,  1],
            [ 1, -1],
        ],
        indices: [0, 1, 2, 0, 2, 3],
    });
    mesh.triangularize(5);
    
    // const mesh = Mesh.createBox(1, 1, 1);
    // mesh.triangularize(4);
    // const mesh = Mesh.createKnot(2, 3, 0.75, 0.1, 8, 32);
    // const mesh = Mesh.loadOBJ(objModel, 0.002);
    // mesh.calculateNormals();
    const mesh2 = Mesh.createIcosphere(1, 3);
    //const mesh = Mesh.createIcosahedron(0.7);
    // mesh.subMeshes.forEach(subMesh => subMesh.topology = "LINES");
    // const mesh2 = Mesh.createKnot(2, 5, 1, 0.2, 32, 64);
    const transform = mat4.create();

    // mesh2.subMeshes.forEach(subMesh => subMesh.topology = "LINE_LOOP");

    const lights = [
        {
            position: [0, 0, 0, 1],
            color: [1, 1, 1],
        },
        {
            position: [0, 1, 1, 0],
            color: [1, 1, 1],
        },
    ];
    lights.forEach((ligth) => vec3.normalize(ligth.position, ligth.position));

    const uniforms1 = {
        diffuse: [0.1, 0.25, 0.45, 1],
        specular: [1, 1, 1, 1],
        shineness: 100,
        lights,
        text1: {
            width: 1,
            height: 1,
            data: [[1, 1, 1, 1]],
        },
        textScale: 32,
        lineWidth: 0.0005,
        time: 0,
        intensity: 0.75,
        speed: 0.25,
    };

    const uniforms2 = {
        diffuse: [1, 1, 1, 1],
        specular: [1, 1, 1, 1],
        lights,
        
        time: 0,
        intensity: 0.025,
        speed: 0.05,
        text1: {
            width: WallTex[0],
            height: WallTex[1],
            data: map256TextToColor(WallTex, 2),
        },
        textScale: 64,
    };

    renderer.vertexShader = vertexLitShader;
    renderer.fragShader = checkersFragShader;
    // renderer.vertexShader = waterShader;
    // renderer.viewport = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    
    let angle = 0;

    return {
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
            
            renderer.uniforms = uniforms1;
            uniforms1.time = time.elapsedtime;
            renderer.vertexShader = waterShader;
            // renderer.vertexShader = vertexLitShader;
            // renderer.fragShader = basicTextFrag;
            renderer.fragShader = defaultFragShader;
            // renderer.fragShader = uvwireFragShader;
            mat4.fromTranslation(transform, [0, -2, 0]);
            // mat4.scale(transform, transform, [0.8, 0.8, 0.8])
            // mat4.rotate(transform, transform, 35 * TO_RAD, [1, 0, 0]);
            // mat4.rotate(transform, transform, angle, [0, 1, 0]);
            renderer.modelMatrix = transform;
            renderer.cullFace = -1;
            renderer.render(mesh);
            
            angle += 35 * TO_RAD * time.deltaTime;
            mat4.fromTranslation(transform, [0, 0, -1]);
            mat4.rotate(transform, transform, angle, [-1, 1, -1]);
            renderer.modelMatrix = transform;
            uniforms2.time = time.elapsedtime;
            renderer.uniforms = uniforms2;
            //renderer.cullFace = 1;
            renderer.vertexShader = waterShader;
            // renderer.fragShader = checkersFragShader;
            renderer.fragShader = defaultFragShader;
            renderer.render(mesh2);
    
            renderer.flush();
        },
    };
}