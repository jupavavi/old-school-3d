import { mat4, mat3, vec3 } from "gl-matrix";

import { numberToDefault } from "./utils";

import createPrimitiveAssembler from "./primitiveAssembler";
import createRaster from "./raster";

import defaultVertexShader from "./shaders/vertex/default";
import defaultFragShader from "./shaders/frag/default";

export default (ctx) => {
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();
    const modelViewMatrix = mat4.create();
    const normalMatrix = mat3.create();
    const pmvMatrix = mat4.create();
    const cameraPosition = vec3.create();
    const raster = createRaster(ctx);
    const primitiveAssembler = createPrimitiveAssembler(raster);
    let vertexShader = defaultVertexShader;
    let uniforms = {};
    raster.fragShader = defaultFragShader;

    return {
        get viewport() { return raster.viewport; },
        set viewport(value) { raster.viewport = value; },
        get vertexShader() { return vertexShader; },
        set vertexShader(value) { vertexShader = value; },
        get fragShader() { return raster.fragShader; },
        set fragShader(value) { raster.fragShader = value; },
        get uniforms() { return uniforms; },
        set uniforms(value) { uniforms = Object.assign({}, value); },
        get modelMatrix() { return modelMatrix; },
        set modelMatrix(value) { mat4.copy(modelMatrix, value); },
        get viewMatrix() { return viewMatrix; },
        set viewMatrix(value) { mat4.copy(viewMatrix, value); },
        get projectionMatrix() { return projectionMatrix; },
        set projectionMatrix(value) { mat4.copy(projectionMatrix, value); },
        get cullFace() { return raster.cullFace; },
        set cullFace(value) { raster.cullFace = value; },
        get depthFunc() { return raster.depthFunc; },
        set depthFunc(value) { raster.depthFunc = value; },
        get depthWriteEnabled() { return raster.depthWriteEnabled; },
        set depthWriteEnabled(value) { raster.depthWriteEnabled = value; },
        get blendEnabled() { return raster.blendEnabled; },
        set blendEnabled(value) { raster.blendEnabled = !!value; },
        get blendSrcFunctionRGB() { return raster.blendSrcFunctionRGB; },
        set blendSrcFunctionRGB(value) { raster.blendSrcFunctionRGB = value; },
        set blendSrcFunctionRGBA(value) { raster.blendSrcFunctionRGBA = value; },
        get blendDstFunctionRGB() { return raster.blendDstFunctionRGB; },
        set blendDstFunctionRGB(value) { raster.blendDstFunctionRGB = value; },
        set blendDstFunctionRGBA(value) { raster.blendDstFunctionRGBA = value; },
        get blendSrcFunctionAlpha() { return raster.blendSrcFunctionAlpha; },
        set blendSrcFunctionAlpha(value) { raster.blendSrcFunctionAlpha = value; },
        get blendDstFunctionAlpha() { return raster.blendDstFunctionAlpha; },
        set blendDstFunctionAlpha(value) { raster.blendDstFunctionAlpha = value; },
        get blendEquationRGB() { return raster.blendEquationRGB; },
        set blendEquationRGB(value) { raster.blendEquationRGB = value; },
        get blendEquationAlpha() { return raster.blendEquationAlpha; },
        set blendEquationAlpha(value) { raster.blendEquationAlpha = value; },
        get blendColor() { return raster.blendColor; },
        set blendColor(color) { raster.blendColor = color; },
        clear() { raster.clear(); },
        resize() { raster.resize(); },
        prepare() {
            mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
            mat3.fromMat4(normalMatrix, modelViewMatrix);
            mat3.invert(normalMatrix, normalMatrix);
            mat3.transpose(normalMatrix, normalMatrix);
            mat4.mul(pmvMatrix, projectionMatrix, modelViewMatrix);
            vec3.set(cameraPosition, -viewMatrix[12], -viewMatrix[13], -viewMatrix[14]);

            const combinedUniforms = {
                cameraPosition,
                normalMatrix,
                projectionMatrix,
                modelViewMatrix,
                modelMatrix,
                viewMatrix,
                pmvMatrix,
                ...uniforms,
            };
            raster.uniforms = combinedUniforms;
        },
        loadBuffer(mesh) {
            primitiveAssembler.loadBuffer(mesh);
        },
        pass() {
            const { indices, vertices, subMeshes } = primitiveAssembler.buffer;
            for(let subMesh of subMeshes) {
                const {
                    elementsOffset = 0,
                    elementsCount = numberToDefault(indices?.length, vertices.length),
                    topology,
                    vertexShader: currentVertexShader = vertexShader,
                } = subMesh;

                // eslint-disable-next-line no-unused-expressions
                primitiveAssembler[topology]?.(
                    elementsOffset,
                    elementsCount,
                    raster.uniforms,
                    currentVertexShader,
                );
            }
        },
        render(mesh) {    
            this.prepare();
            this.loadBuffer(mesh);
            this.pass();
        },
        flush() {
            return raster.flush();
        },
    };
};
