import Behaviour from "./Behaviour";

export default class Renderer extends Behaviour {
    mesh = null;
    material = null;

    render(deferredRender = false) {
        const { engine, mesh, transform, material } = this;
        const { renderer } = engine;
        const { passes, uniforms } = material;
        renderer.modelMatrix = transform.getLocalToWorldMatrix(renderer.modelMatrix);
        renderer.uniforms = uniforms;
        renderer.prepare();
        renderer.loadBuffer(mesh);
        const { length: passesCount } = passes;
        for(let p = 0; p < passesCount; p += 1) {
            const { vertexShader, fragShader, attrs, deferred } = passes[p];
            if (deferred !== deferredRender) {
                continue;
            }
            renderer.vertexShader = vertexShader;
            renderer.fragShader = fragShader;
            Object.assign(renderer, attrs);
            renderer.pass();
        }
    }
}
