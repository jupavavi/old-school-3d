import { vec3, mat4, quat } from "gl-matrix";
import SimpleTree from "./SimpleTree";

export default class Transform extends SimpleTree {
    // LOCAL PROPS
    #localRotation = [0, 0, 0, 1]; // quaternion (gl-matrix uses index-3 as w for quaternions)
    #localPosition = [0, 0, 0]; // vec3
    #localScale    = [1, 1, 1]; // vec3
    
    // GLOBAL PROPS
    #matrix        = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; // mat4
    #invMat        = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; // mat4
    #position      = [0, 0, 0];
    #rotation      = [0, 0, 0, 1]; // quaternion (gl-matrix uses index-3 as w for quaternions)
    #lossyScale    = [1, 1, 1]; // vec3
    #right         = [1, 0, 0]; // vec3
    #up            = [0, 1, 0]; // vec3
    #forward       = [0, 0,-1]; // vec3

    // SETTERS AND GETTERS
    // TODO: set up, right and forward
    get up() { return this.#up; }
    get right() { return this.#right; }
    get forward() { return this.#forward; }

    get localPosition() { return this.#localPosition; }
    set localPosition(value) {
        vec3.copy(this.#localPosition, value);
        this.update();
    }

    get localScale() { return this.#localScale; }
    set localScale(value) {
        vec3.copy(this.#localScale, value);
        this.update();
    }

    get localRotation() { return this.#localRotation; }
    set localRotation(value) {
        quat.copy(this.#localRotation, value);
        quat.normalize(this.#localRotation, this.#localRotation);
        this.update();
    }

    get rotation() { return this.#rotation; }
    set rotation(value) {
        const { parent } = this;
        if (parent) {
            quat.conjugate(this.#localRotation, parent.#rotation);
            quat.mul(this.#localRotation, this.#localRotation, value);
            quat.normalize(this.#localRotation, this.#localRotation);
        } else {
            quat.copy(this.#localRotation, value);
        }
        this.update();
    }

    get position() { return this.#position; }
    set position(value) {
        vec3.transformMat4(this.#localPosition, value, this.#invMat);
        this.update();
    }

    get lossyScale() { return this.#lossyScale; }

    get localToWorldMatrix() { return this.#matrix; }
    get worldToLocalMatrix() { return this.#invMat; }

    // METHODS
    update() {
        mat4.fromRotationTranslationScale(
            this.#matrix,
            this.#localRotation,
            this.#localPosition,
            this.#localScale,
        );

        quat.copy(this.#rotation, this.#localRotation);

        const { parent, children } = this;

        if (parent) {
            quat.mul(this.#rotation, parent.#rotation, this.#rotation);
            quat.normalize(this.#rotation, this.#rotation);
            mat4.multiply(this.#matrix, parent.#matrix, this.#matrix);
        }
        vec3.set(this.#position, this.#matrix[12], this.#matrix[13], this.#matrix[14]);
        mat4.getScaling(this.#lossyScale, this.#matrix);
        vec3.set(this.#right  , 1, 0, 0);
        vec3.set(this.#up     , 0, 1, 0);
        vec3.set(this.#forward, 0, 0,-1);
        vec3.transformQuat(this.#up, this.#up, this.#rotation);
        vec3.transformQuat(this.#right, this.#right, this.#rotation);
        vec3.transformQuat(this.#forward, this.#forward, this.#rotation);

        mat4.invert(this.#invMat, this.#matrix);

        for(let child of children) { child.update(); }
    }

    toWorldPosition(out, point) {
        return vec3.transformMat4(out, point, this.#matrix);
    }

    toLocalPosition(out, point) {
        return vec3.transformMat4(out, point, this.#invMat);
    }

    translateByVector(dir) {
        this.translateByValues(dir[0], dir[1], dir[2]);
    }

    translateLocallyByVector(dir) {
        this.translateLocallyByValues(dir[0], dir[1], dir[2]);
    }

    translateByValues(x, y, z) {
        this.#localPosition[0] = this.#position[0] + x;
        this.#localPosition[1] = this.#position[1] + y;
        this.#localPosition[2] = this.#position[2] + z;
        this.toLocalPosition(this.#localPosition, this.#localPosition);
        this.update();
    }

    translateLocallyByValues(x, y, z) {
        this.#localPosition[0] += x;
        this.#localPosition[1] += y;
        this.#localPosition[2] += z;
        this.update();
    }

    rotateByQuat(rotation) {
        quat.mul(this.#rotation, this.#rotation, rotation);
        this.rotation = this.#rotation;
    }
    rotateLocallyByQuat(rotation) {
        quat.mul(this.#localRotation, this.#localRotation, rotation);
        this.localRotation = this.#localRotation;
    }
}
