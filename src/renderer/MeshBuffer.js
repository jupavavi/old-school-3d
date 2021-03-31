export default class MeshBuffer {
    constructor(meshData) {
        const { indices, subMeshes, ...attrsData } = meshData;
        const entries = Object.entries(attrsData);
        const attrsDescriptor = [];
        const data = [];
        let stride = 0;
        let minLength = 999999;

        for(let [name, value] of entries) {
            if (!(Array.isArray(value) || value instanceof Float32Array) || value.length <= 0) {
                continue;
            }
            const firstItem = value[0];

            const isArray = Array.isArray(firstItem) || firstItem instanceof Float32Array;
            const size = isArray ? firstItem.length : 1;

            if (size < 1) continue;

            attrsDescriptor.push({
                name,
                size,
            });

            minLength = Math.min(minLength, value.length);
            stride += size;
        }

        for (let a = 0; a < minLength; a += 1) {
            for(let { name } of attrsDescriptor) {
                const value = meshData[name][a];
                data.push(...[value].flat().map(v => (v * 1) || 0));
            }
        }

        Object.defineProperties(this, {
            indices: {
                value: indices,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            subMeshes: {
                value: subMeshes,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            descriptor: {
                value: attrsDescriptor,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            data: {
                value: data,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            stride: {
                value: stride,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            vertexCount: {
                value: data.length / stride,
                enumerable: true,
                writable: false,
                configurable: false,
            },
        });
    }

    getVertexData(idx) {
        const { data, descriptor, stride } = this;
        let offset = idx * stride;
        return descriptor.reduce((acc, { name, size }) => {
            const end = offset + size;
            acc[name] = data.slice(offset, end);
            offset = end;
            return acc;
        }, {});
    }
}
