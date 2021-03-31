import { vec3, vec4, mat4 } from "gl-matrix";
import Behaviour from './Behaviour';
import { TO_RAD } from '../utils';

export default class Camera extends Behaviour {
    // PUBLIC PROPERTIES
    backgroundColor = new Float32Array([0.2588, 0.5255, 0.9568, 1]); // Nice blue

    // PRIVATE PROPERTIES
    #fieldOfView = 60;
    #nearClipPlane = 0.05;
    #farClipPlane = 1000;
    #rect = { x: 0, y: 0, width: 1, height: 1 };
    #orthographic = false;
    #orthographicSize = 1;
    #projectionMatrix    = mat4.create();
    #worldToCameraMatrix = mat4.create();
    #cullingMatrix       = mat4.create();
    #frustumPlanes = [
        [0, 0, 0, 0], // near
        [0, 0, 0, 0], // far
        [0, 0, 0, 0], // left
        [0, 0, 0, 0], // right
        [0, 0, 0, 0], // bottom
        [0, 0, 0, 0], // top
    ];
    // custom aspect ratio
    #customAspect = null;
    // if this isn't null, they would prevent calculation of defatult projection matrix
    #customProjectionMatrix = null;
    // if this isn't null, they would prevent calculation of defatult view matrix
    #customWorldToCameraMatrix = null;
    // if this isn't null, they would prevent calculation of defatult culling matrix
    #customCullingMatrix = null;

    constructor(gameObject) {
        super(gameObject);
        this.#calculateProjectionMatrix();
    }
    
    // PRIVATE METHODS

    #updateFrustumPlanes = () => {
        const cm = this.cullingMatrix;
        const row1 = [cm[0], cm[4], cm[ 8], cm[12]];
        const row2 = [cm[1], cm[5], cm[ 9], cm[13]];
        const row3 = [cm[2], cm[6], cm[10], cm[14]];
        const row4 = [cm[3], cm[7], cm[11], cm[15]];

        // x, y and z for the plane normal and w for the plane distance
        vec4.add(this.#frustumPlanes[0], row4, row3); // near
        vec4.sub(this.#frustumPlanes[1], row4, row3); // far
        vec4.add(this.#frustumPlanes[2], row4, row1); // left
        vec4.sub(this.#frustumPlanes[3], row4, row1); // right
        vec4.add(this.#frustumPlanes[4], row4, row2); // bottom
        vec4.sub(this.#frustumPlanes[5], row4, row2); // top
    }

    #getCullingMatrix = () => (
        mat4.mul(this.#cullingMatrix, this.projectionMatrix, this.worldToCameraMatrix)
    )

    #calculateProjectionMatrix = () => {
        const near = this.#nearClipPlane;
        const far = this.#farClipPlane;
        const aspect = this.aspect;

        if (this.orthographic) {
            const hw = this.#orthographicSize * aspect;
            const hh = this.#orthographicSize;
            mat4.ortho(
                this.#projectionMatrix,
                -hw, hw, -hh, hh, near, far,
            );
        } else {
            mat4.perspective(
                this.#projectionMatrix,
                this.fieldOvView * TO_RAD,
                aspect,
                near,
                far,
            );
        }
    }

    #getWorldToCameraMatrix = () => {
        const { position, forward, up } = this.transform;
        const center = vec3.add([0, 0, 0], position, forward);
        return mat4.lookAt(this.#worldToCameraMatrix, position, center, up);
    }

    // GETTERS AND SETTERS

    get fieldOfView() { return this.#fieldOfView; }
    set fieldOfView(value) {
        this.#fieldOfView = value;
        this.#calculateProjectionMatrix();
    }
    get rect() { return this.#rect; }
    get nearClipPlane() { return this.#nearClipPlane; }
    set nearClipPlane(value) {
        this.#nearClipPlane = value;
        this.#calculateProjectionMatrix();
    }
    get farClipPlane() { return this.#farClipPlane; }
    set farClipPlane(value) {
        this.#farClipPlane = value;
        this.#calculateProjectionMatrix();
    }
    get orthographic() { return this.#orthographic; }
    set orthographic(value) {
        this.#orthographic = value;
        this.#calculateProjectionMatrix();
    }
    get orthographicSize() { return this.#orthographicSize; }
    set orthographicSize(value) {
        this.#orthographicSize = value;
        if (this.#orthographic) {
            this.#calculateProjectionMatrix();
        }
    }

    get aspect() {
        return this.#customAspect || (this.pixelRect.width / this.pixelRect.height);
    }

    set aspect(value) { this.#customAspect = value; }

    get pixelRect() {
        const { renderer } = this.engine;

        return {
            x: this.#rect.x * renderer.width,
            y: this.#rect.y * renderer.height,
            width: this.#rect.width * renderer.width,
            height: this.#rect.height * renderer.height,
        };
    }

    get projectionMatrix() {
        return this.#customProjectionMatrix || this.#projectionMatrix;
    }

    set projectionMatrix(value) {
        this.#customProjectionMatrix = value;
    }

    get worldToCameraMatrix() {
        return this.#customWorldToCameraMatrix || this.#getWorldToCameraMatrix();
    }

    set worldToCameraMatrix(value) {
        this.#customWorldToCameraMatrix = value;
    }

    get cullingMatrix() {
        return this.#customCullingMatrix || this.#getCullingMatrix();
    }

    set cullingMatrix(value) { this.#customCullingMatrix = value; }

    render() {
        this.#updateFrustumPlanes();

        // TODO: implement this
    }
}
