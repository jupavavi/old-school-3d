import { vec3 } from "gl-matrix";
import { createKnotCurve, normalFrom3Points } from './utils';


export default class Mesh {
    constructor({
        vertices = [],
        normal = [],
        tangent = [],
        uv = [],
        uv2 = [],
        uv3 = [],
        uv4 = [],
        indices = null,
        subMeshes,
    }) {
        this.vertices = vertices;
        this.normal = normal;
        this.tangent = tangent;
        this.uv = uv;
        this.uv2 = uv2;
        this.uv3 = uv3;
        this.uv4 = uv4;
        this.indices = indices;
        this.subMeshes = subMeshes || [{
            elementsOffset: 0,
            elementsCount: !Number.isNaN(indices?.length) ? indices.length : vertices.length,
            topology: 'TRIANGLES',
        }];
    }

    calculateNormals() {
        if (this.vertices.length === 0 || this.indices.length === 0) {
            return;
        }

        const normal = this.vertices.map(() => ({ normal: [0, 0, 0], count: 0 }));
        const tmpNormal = [0, 0, 0];

        for(let t = 0; t < this.indices.length; t += 3) {
            const i0 = this.indices[t + 0];
            const i1 = this.indices[t + 1];
            const i2 = this.indices[t + 2];

            const v0 = this.vertices[i0];
            const v1 = this.vertices[i1];
            const v2 = this.vertices[i2];

            normalFrom3Points(tmpNormal, v0, v1, v2);

            vec3.add(normal[i0].normal, normal[i0].normal, tmpNormal);
            vec3.add(normal[i1].normal, normal[i1].normal, tmpNormal);
            vec3.add(normal[i2].normal, normal[i2].normal, tmpNormal);

            normal[i0].count++;
            normal[i1].count++;
            normal[i2].count++;
        }

        this.normal = normal.map(({normal, count}) => {
            const [ nx, ny, nz ] = normal;
            return [ nx / count, ny / count, nz / count ];
        });
    }

    calculateBounds() {
        if (this.vertices.length === 0) {
            return;
        }

        const min = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
        const max = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

        this.vertices.forEach(([x, y, z]) => {
            min[0] = Math.min(x, min[0]);
            min[1] = Math.min(y, min[1]);
            min[2] = Math.min(z, min[2]);

            max[0] = Math.max(x, max[0]);
            max[1] = Math.max(y, max[1]);
            max[2] = Math.max(z, max[2]);
        });

        this.bounds = Object.freeze({
            max: Object.freeze(max),
            min: Object.freeze(min),
            center: Object.freeze([
                (max[0] + min[0]) * 0.5,
                (max[1] + min[1]) * 0.5,
                (max[2] + min[2]) * 0.5,
            ]),
            size: Object.freeze([
                max[0] - min[0],
                max[1] - min[1],
                max[2] - min[2],
            ]),
        });
    }

    triangularize(resolution) {
        const {
            vertices,
            normal,
            uv,
            subMeshes,
        } = this;
        const pointCache = {};
        const middle = (v1, v2) => ([
            (v1[0] + v2[0]) * 0.5,
            (v1[1] + v2[1]) * 0.5,
            (v1[2] + v2[2]) * 0.5,
        ]);
        const middle2 = (v1, v2) => ([
            (v1[0] + v2[0]) * 0.5,
            (v1[1] + v2[1]) * 0.5,
        ]);
        const getMiddlePoint = (p1, p2) => {
            const min = Math.min(p1, p2);
            const max = Math.max(p1, p2);
            const cacheKey = (min << 16) + max;

            let index = pointCache[cacheKey];
            if (index !== undefined) return index;

            const v1 = vertices[p1];
            const v2 = vertices[p2];

            const n1 = normal[p1];
            const n2 = normal[p2];
            const u1 = uv[p1];
            const u2 = uv[p2];

            index = vertices.push(middle(v1, v2)) - 1;
            if (n1 && n2) {
                normal.push(middle(n1, n2));
            }
            if (u1 && u2) {
                uv.push(middle2(u1, u2));
            }

            pointCache[cacheKey] = index;

            return index;
        }

        // refine triangles
        for (let i = 0; i < resolution; i++) {
            const { indices } = this;
            const indices2 = [];

            for (let t = 0, len = indices.length; t < len; t += 3) {
                // replace triangle by 4 triangles
                const a = getMiddlePoint(indices[t + 0], indices[t + 1]);
                const b = getMiddlePoint(indices[t + 1], indices[t + 2]);
                const c = getMiddlePoint(indices[t + 2], indices[t + 0]);

                indices2.push(indices[t + 0], a, c);
                indices2.push(indices[t + 1], b, a);
                indices2.push(indices[t + 2], c, b);
                indices2.push(a, b, c);
            }
            this.indices = indices2;
        }

        for(let subMesh of subMeshes) {
            subMesh.elementsOffset *= 4 ** resolution;
            subMesh.elementsCount *= 4 ** resolution;
        }
    }

    static createKnot(q, p, size = 1, radius = 0.5, slices = 10, rings = 10) {
        const indicesData = Array(slices * rings * 6); // 2 triangles per square * 3 vertices indices
        const verticesCount = (slices + 1) * (rings + 1);
        const verticesData = Array(verticesCount);
        const normalsData = Array(verticesCount);
        const uvData = Array(verticesCount);

        const thetaInc = Math.PI * 2 / slices;
        const du = 1 / slices;
        const dv = (q + p) / rings;
        let u = 0;
        let v = 1;
        const circle = Array(slices + 1);
        const curve = createKnotCurve(q, p, size, rings);
        curve.pop(); // no need loop

        for (let j = 0, theta = 0; j <= slices; j++, theta += thetaInc) {
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            circle[j] = [ct, st, 0];
        }

        let vindex = 0;
        let tindex = 0;

        const ref = [0, 0, 0];
        const normal = [0, 0, 0];
        const binormal = [0, 0, 0];
        const tangent = [0, 0, 1];

        for (let i = 0; i <= rings; i++) {
            vec3.normalize(ref, curve[i % rings]);
            vec3.sub(tangent, curve[(i + 1) % rings], curve[(i - 1 + rings) % rings]);
            vec3.normalize(tangent, tangent);

            vec3.cross(binormal, tangent, ref);
            vec3.normalize(binormal, binormal);

            vec3.cross(normal, tangent, binormal);
            vec3.normalize(normal, normal);

            const [tx, ty, tz] = curve[i % rings];

            u = 0;
            for (let j = 0; j <= slices; j++) {

                const [cx, cy, /* cz */] = circle[j % slices]; // cz is always 0

                const nx = normal[0] * cx + binormal[0] * cy /* + tangent[0] * cz */;
                const ny = normal[1] * cx + binormal[1] * cy /* + tangent[1] * cz */;
                const nz = normal[2] * cx + binormal[2] * cy /* + tangent[2] * cz */;

                // postion
                verticesData[vindex] = [
                    (nx * radius + tx),
                    (ny * radius + ty),
                    (nz * radius + tz),
                ];
                // normal
                normalsData[vindex] = [nx, ny, nz];
                // uv
                uvData[vindex] = [u, v];

                vindex++;

                if (j + 1 <= slices && i + 1 <= rings) {
                    const sp1 = slices + 1;
                    const i0 = (i * sp1 + j);
                    const i1 = ((i + 1) * sp1 + j);
                    const i2 = ((i + 1) * sp1 + (j + 1) % sp1);
                    const i3 = (i * sp1 + (j + 1) % sp1);

                    indicesData[tindex++] = i0;
                    indicesData[tindex++] = i1;
                    indicesData[tindex++] = i2;

                    indicesData[tindex++] = i0;
                    indicesData[tindex++] = i2;
                    indicesData[tindex++] = i3;
                }
                u += du;
            }
            v -= dv;
        }

        return new Mesh({
            vertices: verticesData,
            indices: indicesData,
            normal: normalsData,
            uv: uvData,
        });
    }

    static createSphere(radius = 1, slices = 60, stacks = 60) {
        const indicesData = Array(slices * stacks * 6); // 3 vertices indices * 2 triangle per quad
        const verticesCount = (slices + 1) * (stacks + 1);
        const verticesData = Array(verticesCount);
        const normalsData = Array(verticesCount);
        const uvData = Array(verticesCount);

        const thetaInc = Math.PI * 2 / slices;
        const alphaInc = Math.PI / stacks;
        let alpha = 0;
        let theta = 0;
        const du = 1 / slices;
        const dv = 1 / stacks;
        let u = 0;
        let v = 1;

        let vindex = 0;
        let tindex = 0;

        for (let i = 0; i <= stacks; i++) {
            theta = 0;
            const c = Math.cos(alpha);
            const s = Math.sin(alpha);
            const r = radius * s;
            const y = radius * c;
            u = 0;
            for (let j = 0; j <= slices; j++) {
                const ct = Math.cos(theta);
                const st = Math.sin(theta);

                const x = -r * ct;
                const z = r * st;

                // postion
                verticesData[vindex] = [x, y, z];
                // normal
                normalsData[vindex] = [-s * ct, c, s * st];
                // uv
                uvData[vindex] = [u, v];

                vindex++;

                if(j <= slices && i + 1 <= stacks) {
                    const sp1 = slices + 1;
                    const i0 = (i * sp1 + j);
                    const i1 = ((i + 1) * sp1 + j);
                    const i2 = ((i + 1) * sp1 + (j + 1) % sp1);
                    const i3 = (i * sp1 + (j + 1) % sp1);

                    indicesData[tindex++] = i0;
                    indicesData[tindex++] = i1;
                    indicesData[tindex++] = i2;

                    indicesData[tindex++] = i0;
                    indicesData[tindex++] = i2;
                    indicesData[tindex++] = i3;
                }

                theta += thetaInc;
                u += du;
            }
            alpha += alphaInc;
            v -= dv;
        }

        return new Mesh({
            vertices: verticesData,
            indices: indicesData,
            normal: normalsData,
            uv: uvData,
        });
    }

    static createBox(w, h, d) {
        const hw = 0.5 * w;
        const hh = 0.5 * h;
        const hd = 0.5 * d;

        const vertices = [
            // FRONT
            [-hw, -hh,  hd],
            [ hw, -hh,  hd],
            [ hw,  hh,  hd],
            [-hw,  hh,  hd],
            // BACK
            [-hw, -hh, -hd],
            [-hw,  hh, -hd],
            [ hw,  hh, -hd],
            [ hw, -hh, -hd],
            // TOP
            [-hw,  hh, -hd],
            [-hw,  hh,  hd],
            [ hw,  hh,  hd],
            [ hw,  hh, -hd],
            // BOTTOM
            [-hw, -hh, -hd],
            [ hw, -hh, -hd],
            [ hw, -hh,  hd],
            [-hw, -hh,  hd],
            // RIGHT
            [ hw, -hh, -hd],
            [ hw,  hh, -hd],
            [ hw,  hh,  hd],
            [ hw, -hh,  hd],
            // LEFT
            [-hw, -hh, -hd],
            [-hw, -hh,  hd],
            [-hw,  hh,  hd],
            [-hw,  hh, -hd],
        ];

        const uv = [
            // FRONT
            [0.0,  0.0],
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
            // BACK
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
            [0.0,  0.0],
            // TOP
            [0.0,  0.0],
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
            // BOTTOM
            [0.0,  0.0],
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
            // RIGHT
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
            [0.0,  0.0],
            // LEFT
            [0.0,  0.0],
            [1.0,  0.0],
            [1.0,  1.0],
            [0.0,  1.0],
        ];

        const indices = [
            0,  1,  2,  0,  2,  3,
            4,  5,  6,  6,  7,  4,
            8,  9, 10,  8, 10, 11,
            12, 13, 14, 14, 15, 12,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23,
        ];

        const normal = [
            // FRONT
            [0, 0, 1],
            // BACK
            [0, 0, -1],
            // TOP
            [0, 1, 0],
            // BOTTOM
            [0, -1, 0],
            // RIGHT
            [1, 0, 0],
            // LEFT
            [-1, 0, 0],
        ].map(n => [n, n, n, n]).reduce((a, b) => a.concat(b));


        // const colors = [
        //     // FRONT
        //     [1, 0, 0, 1],
        //     // RIGHT
        //     [0, 1, 0, 1],
        //     // BACK
        //     [1, 1, 0, 1],
        //     // LEFT
        //     [0, 0, 1, 1],
        //     // TOP
        //     [1, 0, 1, 1],
        //     // BOTTOM
        //     [0, 1, 1, 1],
        // ].map(c => [c, c, c, c]).reduce((a, b) => a.concat(b));

        return new Mesh({
            vertices,
            indices,
            normal,
            uv,
        });
    }

    static createIcosahedron(radius = 1) {
        const nx = 0.525731112119133606;
        const nz = 0.850650808352039932;
        const nn = 0;

        const x = nx * radius;
        const z = nz * radius;
        const n = nn * radius;

        const { PI, acos, atan2 } = Math;

        const vertices = [
            [ -x, +n, -z ],
            [ +x, +n, -z ],
            [ -x, +n, +z ], // 2
            [ +x, +n, +z ],

            [ +n, +z, -x ],
            [ +n, +z, +x ], // 5
            [ +n, -z, -x ],
            [ +n, -z, +x ], // 7

            [ +z, +x, -n ],
            [ -z, +x, -n ], // 9
            [ +z, -x, -n ],
            [ -z, -x, -n ], // 11

            // dups
            [ +n, +z, -n ], // 4 -> 5
            [ +n, +z, -n ], // 4 -> 5
            [ -z, +x, -n ], // 9
            [ -z, -x, -n ], // 11
            [ +n, -z, -n ], // 6 -> 7
            [ +n, -z, -n ], // 6 -> 7
        ];

        const normal = [
            [ -nx, +nn, -nz ],
            [ +nx, +nn, -nz ],
            [ -nx, +nn, +nz ], // 2
            [ +nx, +nn, +nz ],

            [ +nn, +nz, -nx ],
            [ +nn, +nz, +nx ], // 5
            [ +nn, -nz, -nx ],
            [ +nn, -nz, +nx ], // 7

            [ +nz, +nx, -nn ],
            [ -nz, +nx, -nn ], // 9
            [ +nz, -nx, -nn ],
            [ -nz, -nx, -nn ], // 11

            // dups
            [ +nn, 1, -nn ], // 4 -> 5
            [ +nn, 1, -nn ], // 4 -> 5
            [ -nz, +nx, -nn ], // 9
            [ -nz, -nx, -nn ], // 11
            [ +nn, -1, -nn ], // 6 -> 7
            [ +nn, -1, -nn ], // 6 -> 7
        ];

        const indices = [
            0, 4, 1,
            0, 9, 4,
            9, 12, 4, //
            14, 5, 13, //
            4, 5, 8,
            4, 8, 1,

            8, 10, 1,
            8, 3, 10,
            5, 3, 8,
            5, 2, 3,
            2, 7, 3,

            7, 10, 3,
            7, 6, 10,
            7, 15, 16, //
            17, 11, 6, //
            11, 0, 6,
            0, 1, 6,

            6, 1, 10,
            9, 0, 11,
            14, 15, 2, //
            14, 2, 5,  //
            7, 2, 15, //
        ];

        const uv = Array(normal.length);

        for(let i = 0, len = uv.length; i < len; i++) {
            const { 0: nx, 1: ny, 2: nz } = normal[i];
            uv[i] = [1 - (atan2(nz, nx) / PI + 1.0) * 0.5, acos(ny) / PI];
        }

        uv[12][0] = 1;
        uv[13][0] = 0;
        uv[14][0] = 0;
        uv[15][0] = 0;
        uv[16][0] = 0;
        uv[17][0] = 1;

        return new Mesh({
            vertices,
            indices,
            normal,
            uv,
        });
    }

    static createIcosphere(radius = 1, subdivisions = 1) {
        const { PI, acos, atan2 } = Math;
        const icosphere = Mesh.createIcosahedron(radius);
        icosphere.triangularize(subdivisions);
        if (subdivisions <= 0) {
            return icosphere;
        }
        const { vertices, normal, uv, indices } = icosphere;
        const { length } = vertices;
        for(let v = 0; v < length; v++) {
            const vertex = vertices[v];
            vec3.normalize(vertex, vertex);
            vec3.copy(normal[v], vertex);
            const { 0: nx, 1: ny, 2: nz } = normal[v];
            uv[v] = [1 - (atan2(nz, nx) / PI + 1.0) * 0.5, acos(ny) / PI];
            
            vec3.scale(vertex, vertex, radius);
        }

        for(let i = 0; i < indices.length; i+= 3) {
            const idx0 = indices[i];
            const idx1 = indices[i + 1];
            const idx2 = indices[i + 2];

            const uvs = [uv[idx0], uv[idx1], uv[idx2]].sort((a, b) => b[0] - a[0]);

            if (Math.abs(1 - uvs[0][0]) < 0.001
             && uvs[1][0] <= 0.5
             && uvs[2][0] <= 0.5) {
                uvs[0][0] = 0;
            }
        }

        return icosphere;
    }

    static loadOBJ(obj, scale) {
        const decRegex = new RegExp('(?!-0?(?:\\.0+)?(?:e|$))-?(?:0|[1-9]\\d*)?(?:\\.\\d+)?(?<=\\d)(?:e-?(?:0|[1-9]\\d*))?');
        const coordinateRegex = new RegExp(`(v|vn|vt)\\s+(${decRegex.source})\\s+(${decRegex.source})\\s+(${decRegex.source})?`);
        const faceElementRegex = /(\d+)(?:\/(\d+)?(?:\/(\d+))?)?/;
        const faceElementRegexGlobal = new RegExp(faceElementRegex, 'g');
        const faceRegex = new RegExp(`f(\\s+${faceElementRegex.source})+`);
        const splitedLines = obj.split(/\n/gm);
        const rawModel = {
            v: [],
            vn: [],
            vt: [],
            g: [[]],
        };
        let subMesh = 0;
        const indicesMapper = (indices) => {
            const [, vi, ti, ni] = indices.match(faceElementRegex);
            return {
                vi: vi - 1,
                ti: ti - 1,
                ni: ni - 1,
            };
        };

        splitedLines.forEach(line => {
            line = line.toLowerCase();
            let lineMatch;
            /* eslint-disable no-cond-assign */
            if ((lineMatch = coordinateRegex.exec(line)) !== null) {
                const [, coord, x, y, z] = lineMatch;
                rawModel[coord].push(z !== undefined ? [x * 1, y * 1, z * 1] : [x * 1, y * 1]);
            } else if ((lineMatch = faceRegex.exec(line) !== null)) {
                const polygon =
                    line.match(faceElementRegexGlobal)
                        .map(indicesMapper);
                rawModel.g[subMesh].push(polygon);
            } else if((lineMatch = line.match(/^g|o\b/) !== null)) {
                subMesh = rawModel.g.push([]) - 1;
            }
            /* eslint-enable no-cond-assign */
        });

        const {
            v,
            vn,
            vt,
            g: groups,
        } = rawModel;

        const vertices = v.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
        const normal  = vn.length > 0 ? Array(vertices.length).fill(null) : undefined;
        const uv       = vt.length > 0 ? Array(vertices.length).fill(null) : undefined;
        let indices = [];
        const subMeshes = [];

        const processFace = (triangles, polygon) => {
            const { length = 0 } = polygon;
            let v0 = -1;
            let v1 = -1;
            let v2 = -1;
            for (let p = 0; p < length; p++) {
                let { vi, ti = -1, ni = -1 } = polygon[p]; // eslint-disable-line prefer-const
                if (uv && uv[vi]) vi = vertices.push(vertices[vi]) - 1;

                if (p === 0) v0 = vi;
                else if (p === 1) v1 = vi;

                if (ti >= 0 && uv) uv[vi] = vt[ti] || [0, 0];
                if (ni >= 0 && normal) normal[vi] = vn[ni] || [0, 0, 0];

                v2 = vi;

                if (p >= 2) {
                    triangles.push(v0, v1, v2);
                    v1 = v2;
                }
            }
            return triangles;
        };

        groups.forEach((polygons) => {
            const triangles = polygons.reduce(processFace, []);

            if (triangles.length > 0) {
                subMeshes.push({
                    elementsOffset: indices.length,
                    elementsCount: triangles.length,
                    topology: 'TRIANGLES',
                });
                indices = indices.concat(triangles);
            }
        });
        for (let i = vertices.length - 1; i >=0 && (normal || uv); i--) {
            if (normal) normal[i] = normal[i] || [0, 0, 0];
            if (uv) uv[i] = uv[i] || [0, 0];
        }

        return new Mesh({
            vertices,
            normal,
            uv,
            subMeshes,
            indices,
        });
    }
}