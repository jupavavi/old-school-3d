import Behaviour from "./Behaviour";

export default class Renderer extends Behaviour {
    mesh = null;
    uniforms = null;

    render(renderer) {
        const {
            mesh,
            transform,
            vertexShader,
            fragShader,
        } = this;
        renderer.modelMatrix = transform.getLocalToWorldMatrix(renderer.modelMatrix);
        renderer.uniforms = uniforms;
        renderer.vertexShader = vertexShader;
        renderer.fragShader = fragShader;
        renderer.render(mesh);
    }
}