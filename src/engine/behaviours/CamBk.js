import Color from '@/core/Color';
import Engine, { CAMERA_CLEAR_FLAGS } from '@/core/Engine';
import Gizmos from '@/core/Gizmos';
import Object3D from '@/core/Object3D';

import Matrix4x4 from '@/math3d/Matrix4x4';
import Plane from '@/math3d/Plane';
import Vector3 from '@/math3d/Vector3';
import Vector4 from '@/math3d/Vector4';

// Private scope

function calculateDefaultCullingMatrix() {
    this._calculatedCullingMatrix = this.projectionMatrix.mul(this.worldToCameraMatrix);
    calculateFrustumPlanes.call(this);
}

function calculateDefaultProjectionMatrix() {
    if (this.orthographic) {
        this._calculatedProjectionMatrix = Matrix4x4.orthoRH(
            this.orthographicSize * this.aspect,
            this.orthographicSize,
            this.nearClipPlane,
            this.farClipPlane);
    } else {
        this._calculatedProjectionMatrix = Matrix4x4.perspectiveRH(
            this.fieldOvView,
            this.aspect,
            this.nearClipPlane,
            this.farClipPlane);
    }

    calculateDefaultCullingMatrix.call(this);
}

function calculateDefaultWorldToCameraMatrix() {
    this._calculatedWorldToCameraMatrix = Matrix4x4.lookAt(
        this.position,
        this.position.add(this.forward),
        this.up);

    // TO RIGHT HAND
    this._calculatedWorldToCameraMatrix.row[2][0] *= -1;
    this._calculatedWorldToCameraMatrix.row[2][1] *= -1;
    this._calculatedWorldToCameraMatrix.row[2][2] *= -1;
    this._calculatedWorldToCameraMatrix.row[2][3] *= -1;

    calculateDefaultCullingMatrix.call(this);
}

function calculateFrustumPlanes() {
    const row1 = new Vector4(...this.cullingMatrix.row[0]);
    const row2 = new Vector4(...this.cullingMatrix.row[1]);
    const row3 = new Vector4(...this.cullingMatrix.row[2]);
    const row4 = new Vector4(...this.cullingMatrix.row[3]);

    let near = row4.add(row3);
    near = new Plane(near, near.w);

    let far = row4.sub(row3);
    far = new Plane(far, far.w);

    let left = row4.add(row1);
    left = new Plane(left, left.w);

    let right = row4.sub(row1);
    right = new Plane(right, right.w);

    let bottom = row4.add(row2);
    bottom = new Plane(bottom, bottom.w);

    let top = row4.sub(row2);
    top = new Plane(top, top.w);

    this._frustumPlanes = [
        near,
        far,
        left,
        right,
        bottom,
        top
    ];
}

export default class Camera extends Object3D {
    constructor(rect = { x: 0, y: 0, width: 1, height: 1 }, fov = 60, near = 0.05, far = 1000) {
        super();

        this.fieldOvView = fov;
        this.rect = rect;
        this.nearClipPlane = near;
        this.farClipPlane = far;
        this.orthographic = false;
        this.orthographicSize = 1;
        this._previousAspect = this.aspect;

        // custom aspect ratio
        this._customAspect = null;
        // if this isn't null, they would prevent calculation of defatult projection matrix
        this._customProjectionMatrix = null;
        // if this isn't null, they would prevent calculation of defatult view matrix
        this._customWorldToCameraMatrix = null;
        // if this isn't null, they would prevent calculation of defatult culling matrix
        this._customCullingMatrix = null;

        this.clearFlags = CAMERA_CLEAR_FLAGS.SOLID_COLOR;
        this.backgroundColor = new Color(0.2588, 0.5255, 0.9568, 1); // Nice blue

        this._calculatedProjectionMatrix    = Matrix4x4.identity;
        this._calculatedWorldToCameraMatrix = Matrix4x4.identity;
        this._frustumPlanes = [];
        calculateDefaultProjectionMatrix.call(this);
        calculateDefaultWorldToCameraMatrix.call(this);
    }

    setPositionAndRotation(position, transform) {
        super.setPositionAndRotation(position, transform);
        calculateDefaultWorldToCameraMatrix.call(this);
    }

    render(objects) {
        const eng = Engine.getInstance();

        if (!objects) {
            super.render && super.render();

            if (eng.settings.debug) {
                eng.uniforms.modelMatrix = this.localToWorldMatrix;

                const fcorners = this.calculateFrustumCorners();

                Gizmos.drawLine(fcorners[0], fcorners[1]);
                Gizmos.drawLine(fcorners[1], fcorners[2]);
                Gizmos.drawLine(fcorners[2], fcorners[3]);
                Gizmos.drawLine(fcorners[3], fcorners[0]);

                Gizmos.drawLine(fcorners[4], fcorners[5]);
                Gizmos.drawLine(fcorners[5], fcorners[6]);
                Gizmos.drawLine(fcorners[6], fcorners[7]);
                Gizmos.drawLine(fcorners[7], fcorners[4]);

                Gizmos.drawLine(fcorners[0], fcorners[4]);
                Gizmos.drawLine(fcorners[1], fcorners[5]);
                Gizmos.drawLine(fcorners[2], fcorners[6]);
                Gizmos.drawLine(fcorners[3], fcorners[7]);
            }
            return;
        }


        const { x, y, width, height } = this.pixelRect;

        // Needs to be recalculated every frame if aspect changes unless a custom matrix is set
        if (!this._customProjectionMatrix && this._previousAspect !== this.aspect) {
            calculateDefaultProjectionMatrix.call(this);
            this._previousAspect = this.aspect;
        }

        const camPos = this.position.clone();
        camPos.z *= -1; // to right hand

        eng.viewport(x, y, width, height);
        eng.scissor(x, y, width, height);
        eng.clearColor(this.backgroundColor);
        eng.clear(this.clearFlags);

        // TODO: Remove hardcoded light source when lighting is supported
        const lightPosition = this.worldToCameraMatrix.transformVector4([10, 10, -10, 0]);

        eng.uniforms = {
            modelMatrix: Matrix4x4.identity,
            normalMatrix: [],
            modelViewMatrix: Matrix4x4.identity,
            viewMatrix: this.worldToCameraMatrix,
            projectionMatrix: this.projectionMatrix,
            cameraPosition: camPos,
            'lightPosition[0]': [...lightPosition],
            'lightColor[0]':[1, 1, 1, 1],
            'lightAtten[0]': [-1, 1, 0, 1],
            'spotDirection[0]': [0, 0, 0, 0]
        };

        // TODO: render to texture capability

        const objectsOnCamera = [];
        const row3 = new Vector4(this.worldToCameraMatrix[2]);
        const position = new Vector4(0, 0, 0, 1);

        const culling = (o) => {
            let intersects = true;
            let min = o.position;
            let max = o.position;
            if (o.bounds) {
                min = o.bounds.min;
                max = o.bounds.max;

                for(let p = 0; p < this._frustumPlanes.length; p++) {
                    const minp = min.clone();
                    const normal = this._frustumPlanes[p].normal;

                    if (normal.x >= 0) {
                        minp.x = max.x;
                    }
                    if (normal.y >=0) {
                        minp.y = max.y;
                    }
                    if (normal.z >= 0) {
                        minp.z = max.z;
                    }

                    if (this._frustumPlanes[p].getDistanceToPoint(minp) < 0) {
                        intersects = false;
                        break;
                    }
                }
            } //else {
            //     for(let p = 0; p < this._frustumPlanes.length; p++) {
            //         if (this._frustumPlanes[p].getDistanceToPoint(o.position) < 0) {
            //             intersects = false;
            //             break;
            //         }
            //     }
            // }

            if (intersects && o.render && o !== this) {
                // if (o.bounds) {
                //     let minp = min.sub(this.position);
                //     let maxp = max.sub(this.position);

                //     position.x = Math.min(Math.abs(this.position.x - min.x), Math.abs(this.position.x - max.x));
                //     position.y = Math.min(Math.abs(this.position.y - min.y), Math.abs(this.position.y - max.y));
                //     position.z = Math.min(Math.abs(this.position.z - min.z), Math.abs(this.position.z - max.z));
                // } else {
                position.x = o.position.x;
                position.y = o.position.y;
                position.z = o.position.z;
                // }

                objectsOnCamera.push({
                    object: o,
                    z: Vector4.dot(row3, position)
                });
            }

            o.children.forEach(child => culling(child));
        };

        objects.forEach(o => culling(o));

        objectsOnCamera.sort((a, b) => a.z - b.z);

        objectsOnCamera.forEach(o => {
            const { object: { localToWorldMatrix }, object } = o;
            const modelViewMatrix = eng.uniforms.viewMatrix.mul(localToWorldMatrix);

            eng.uniforms.modelMatrix = localToWorldMatrix;
            eng.uniforms.modelViewMatrix = modelViewMatrix,
            eng.uniforms.normalMatrix = modelViewMatrix.inverse.get3x3(eng.uniforms.normalMatrix || []);

            object.render();
        });
    }

    get pixelRect() {
        const eng = Engine.getInstance();

        return {
            x: this.rect.x * eng.settings.pixelWith,
            y: this.rect.y * eng.settings.pixelHeight,
            width: this.rect.width * eng.settings.pixelWith,
            height: this.rect.height * eng.settings.pixelHeight
        };
    }

    get aspect() {
        return this._customAspect || (this.pixelRect.width / this.pixelRect.height);
    }

    set aspect(value) {
        this._customAspect = value;
    }

    get projectionMatrix() {
        return this._customProjectionMatrix || this._calculatedProjectionMatrix;
    }

    set projectionMatrix(value) {
        this._customProjectionMatrix = value;
        calculateDefaultCullingMatrix.call(this);
    }

    get worldToCameraMatrix() {
        return this._customWorldToCameraMatrix || this._calculatedWorldToCameraMatrix;
    }

    set worldToCameraMatrix(value) {
        this._customWorldToCameraMatrix = value;
        calculateDefaultCullingMatrix.call(this);
    }

    get cullingMatrix() {
        return this._customCullingMatrix || this._calculatedCullingMatrix;
    }

    set cullingMatrix(value) {
        this._customCullingMatrix = value;
        calculateFrustumPlanes.call(this);
    }

    calculateFrustumCorners(z) {
        const aperture = Math.tan(this.fieldOvView * Math.PI / 360.0);
        const nymax = this.nearClipPlane * aperture;
        const nymin = -nymax;
        const nxmin = nymin * this.aspect;
        const nxmax = nymax * this.aspect;

        const fymax = this.farClipPlane * aperture;
        const fymin = -fymax;
        const fxmin = fymin * this.aspect;
        const fxmax = fymax * this.aspect;

        return [
            new Vector3(nxmax, nymax, this.nearClipPlane),
            new Vector3(nxmax, nymin, this.nearClipPlane),
            new Vector3(nxmin, nymin, this.nearClipPlane),
            new Vector3(nxmin, nymax, this.nearClipPlane),

            new Vector3(fxmax, fymax, z ? z : this.farClipPlane),
            new Vector3(fxmax, fymin, z ? z : this.farClipPlane),
            new Vector3(fxmin, fymin, z ? z : this.farClipPlane),
            new Vector3(fxmin, fymax, z ? z : this.farClipPlane)
        ];
    }

    worldToViewportPoint(v, result = Vector4.zero) {
        result = this.worldToCameraMatrix.transformPoint(v, result);
        result = this.projectionMatrix.transformVector4(result, result);

        result.x /= result.w;
        result.y /= result.w;
        result.z /= result.w;

        return result;
    }

    viewportToScreenPoint(v, result = Vector4.zero) {
        const pixelRect = this.pixelRect;

        result.x = Math.ceil(pixelRect.x + pixelRect.width  * 0.5 *  v.x + pixelRect.width  * 0.5);
        result.y = Math.ceil(pixelRect.y + pixelRect.height * 0.5 * -v.y + pixelRect.height * 0.5);
        result.z = v.z;
        result.w = v.w || 0;

        return result;
    }
}