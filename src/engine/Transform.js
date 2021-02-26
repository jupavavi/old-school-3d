import { vec3, mat4, quat } from "gl-matrix";
import SimpleTree from "./SimpleTree";

const { BYTES_PER_ELEMENT } = Float32Array;

export const Space = Object.freeze({
    world: 0,
    local: 1,
});

export default class Transform extends SimpleTree {
    #localRotation       = new Float32Array(4); // quaternion
    #localPosition       = new Float32Array(3); // vec3
    #localScale          = new Float32Array(3); // vec3
    
    #matrix              = new Float32Array(16); // mat4
    #invMat              = new Float32Array(16); // mat4
    #position            = new Float32Array(this.#matrix.buffer, 12 * BYTES_PER_ELEMENT, 3); // data view of #matrix as vec3
    #rotation            = new Float32Array(4); // quaternion

    constructor(name) {
        super(name);

        this.#matrix[ 0] = 1;
        this.#matrix[ 5] = 1;
        this.#matrix[10] = 1;
        this.#matrix[15] = 1;

        this.#invMat[ 0] = 1;
        this.#invMat[ 5] = 1;
        this.#invMat[10] = 1;
        this.#invMat[15] = 1;
        // set rotation
        this.#rotation[3]      = 1; // gl-matrix uses index-3 as w for quaternions
        this.#localRotation[3] = 1; // gl-matrix uses index-3 as w for quaternions
        // scale set to one
        this.#localScale[0] = 1;
        this.#localScale[1] = 1;
        this.#localScale[2] = 1;
    }

    getUp(out) {
        vec3.set(out, 0, 1, 0);
        return vec3.transformQuat(out, out, this.#rotation);
    }

    getRight(out) {
        vec3.set(out, 1, 0, 0);
        return vec3.transformQuat(out, out, this.#rotation);
    }

    getForward(out) {
        vec3.set(out, 0, 0, -1);
        return vec3.transformQuat(out, out, this.#rotation);
    }

    getLocalPosition(out) { return vec3.copy(out, this.#localPosition); }
    setLocalPosition(value) {
        vec3.copy(this.#localPosition, value);
        this.update();
    }
    getLocalScale(out) { return vec3.copy(out, this.#localScale); }
    setLocalScale(value) {
        vec3.copy(this.#localScale, value);
        this.update();
    }
    getLocalRotation(out) { return quat.copy(out, this.#localRotation); }
    setLocalRotation(value) {
        quat.copy(this.#localRotation, value);
        quat.normalize(this.#localRotation, this.#localRotation);
        this.update();
    }
    getPosition(out) {
        return vec3.copy(out, this.#position);
    }
    setPosition(value) {
        vec3.transformMat4(this.#localPosition, value, this.#invMat);
        this.update();
    }
    getRotation(out) {
        return quat.copy(out, this.#rotation);
    }
    setRotation(value) {
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
    getLossyScale(out) {
        return mat4.getScaling(out, this.#matrix);
    }
    getLocalToWorldMatrix(out) {
        return mat4.copy(out, this.#matrix);
    }
    getWorldToLocalMatrix(out) {
        return mat4.copy(out, this.#invMat);
    }
    toWorldPosition(out, point) {
        return vec3.transformMat4(out, point, this.#matrix);
    }
    toLocalPosition(out, point) {
        return vec3.transformMat4(out, point, this.#invMat);
    }
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
        mat4.invert(this.#invMat, this.#matrix);

        for(let child of children) {
            child.update();
        }
    }

    translateByVector(dir, space = Space.world) {
        this.translateByValues(dir[0], dir[1], dir[2], space);
    }
    translateByValues(x, y, z, space = Space.world) {
        if (space === Space.world) {
            this.#localPosition[0] = this.#position[0] + x;
            this.#localPosition[1] = this.#position[1] + y;
            this.#localPosition[2] = this.#position[2] + z;
            this.toLocalPosition(this.#localPosition, this.#localPosition);
        } else {
            this.#localPosition[0] += x;
            this.#localPosition[1] += y;
            this.#localPosition[2] += z;
        }
        this.update();
    }
    rotateByQuat(rotation, space = Space.world) {
        if (space === Space.world) {
            quat.mul(this.#rotation, this.#rotation, rotation);
            this.setRotation(this.#rotation);
        } else {
            quat.mul(this.#localRotation, this.#localRotation, rotation);
            this.setLocalRotation(this.#localRotation);
        }
    }
}
