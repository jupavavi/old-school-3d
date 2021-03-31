import { clipLine, clipTrangle } from "./clip";
import {
    clamp,
    testFunctions,
    toColor32,
} from "./utils";
import {
    blendFunctionsRGB,
    blendFunctionsAlpha,
    blendEquationsRGB,
    blendEquationsAlpha,
} from "./blend";
import createRasterFunctions from "./rasterFunctions";

const DEFAULT_CLEAR_COLOR = [0, 0, 0, 1];

const isFrontFace = (pp0, pp1, pp2) => {
    const { 0: x0, 1: y0 } = pp0;
    const { 0: x1, 1: y1 } = pp1;
    const { 0: x2, 1: y2 } = pp2;
    return Math.sign((
        x0 * y1 - x1 * y0 +
        x1 * y2 - x2 * y1 +
        x2 * y0 - x0 * y2
    ) * 0.5);
};

export default (ctx) => {
    // COLOR BUFFER
    let { width, height } = ctx.canvas;
    let pixelData = null;
    let colorBuffer = null;
    let colorBuffer32 = null;
    let isColorBufferLittleEndian = true;
    // DEPTH BUFFER
    let depthBuffer = null;
    let depthFuncRef = testFunctions.less;
    let depthFunc = "less";
    let depthWriteEnabled = true;
    const MAX_DEPTH = 0xFFFF | 0; // max 16 bit integer
    // CLIP & CULLING
    let cullFace = -1;
    let viewport = { x: 0, y: 0, width: 1, height: 1 };
    // BLENDING
    const blendColor = new Float32Array(4);
    const blendSrc = new Float32Array(4);
    const blendDst = new Float32Array(4);
    let blendEnabled = false;
    let blendSrcFunctionRGB = "one";
    let blendDstFunctionRGB = "zero";
    let blendSrcFunctionAlpha = "one";
    let blendDstFunctionAlpha = "zero";
    let blendEquationRGB = "add";
    let blendEquationAlpha = "add";
    let blendSrcFunctionRGBRef = blendFunctionsRGB[blendSrcFunctionRGB];
    let blendDstFunctionRGBRef = blendFunctionsRGB[blendDstFunctionRGB];
    let blendSrcFunctionAlphaRef = blendFunctionsAlpha[blendSrcFunctionAlpha];
    let blendDstFunctionAlphaRef = blendFunctionsAlpha[blendDstFunctionAlpha];
    let blendEquationRGBRef = blendEquationsRGB[blendEquationRGB];
    let blendEquationAlphaRef = blendEquationsAlpha[blendEquationAlpha];
    // PRIMITIVE PROCESSING
    let count = 0;
    const vertex0 = { position: [0, 0, 0, 0], attrs: null };
    const vertex1 = { position: [0, 0, 0, 0], attrs: null };
    const vertex2 = { position: [0, 0, 0, 0], attrs: null };

    const createBuffers = () => {
        ({ width, height } = ctx.canvas);
        if (width <= 0 || height <= 0) {
            return;
        }
        pixelData = ctx.createImageData(width, height);
        colorBuffer = pixelData.data;
        colorBuffer32 = new Uint32Array(colorBuffer.buffer);
        colorBuffer32[0] = 0x0F000000;
        isColorBufferLittleEndian = pixelData.data[0] !== 0x0F;
        colorBuffer32[0] = 0;
        depthBuffer = new Uint16Array(width * height);
        depthBuffer.fill(MAX_DEPTH);
    };

    const toDeviceCoords = (out, coords) => {
        const { x: vx, y: vy, width: vw, height: vh } = viewport;
        const { 0: x, 1: y, 2: z, 3: w = 1} = coords;
        const nx = ((x / w) * 0.5 + 0.5);
        const ny = ((y / w) * 0.5 + 0.5);
        const nz = ((z / w) * 0.5 + 0.5);

        out[0] = ((nx * vw + vx) * width) | 0;
        out[1] = (((1 - ny) * vh + vy) * height) | 0;
        out[2] = (nz * MAX_DEPTH) | 0;
        out[3] = w;
    };

    const depthTest = (x, y, z) => {
        x = x | 0;
        y = y | 0;
        z = z | 0;
        const offset = x + y * width;
        return !(x < 0 || x >= width
            || y < 0 || y >= height
            || z < 0 || z >= MAX_DEPTH
            || !depthFuncRef(depthBuffer[offset], z));
    };

    const writePixel = (x, y, z, srcColor) => {
        if (!srcColor) return;

        x = x | 0;
        y = y | 0;
        z = z | 0;
        const offset = x + y * width;

        if (blendEnabled) {
            const offset4 = offset * 4;
            blendDst[0] = colorBuffer[offset4 + 0] / 255;
            blendDst[1] = colorBuffer[offset4 + 1] / 255;
            blendDst[2] = colorBuffer[offset4 + 2] / 255;
            blendDst[3] = colorBuffer[offset4 + 3] / 255;

            blendSrcFunctionRGBRef(blendSrc, srcColor, srcColor, blendDst, blendColor);
            blendSrcFunctionAlphaRef(blendSrc, srcColor, srcColor, blendDst, blendColor);
            blendDstFunctionRGBRef(blendDst, blendDst, srcColor, blendDst, blendColor);
            blendDstFunctionAlphaRef(blendDst, blendDst, srcColor, blendDst, blendColor);
            blendEquationRGBRef(blendDst, blendSrc, blendDst);
            blendEquationAlphaRef(blendDst, blendSrc, blendDst);

            colorBuffer[offset4 + 0] = blendDst[0] * 255;
            colorBuffer[offset4 + 1] = blendDst[1] * 255;
            colorBuffer[offset4 + 2] = blendDst[2] * 255;
            colorBuffer[offset4 + 3] = blendDst[3] * 255;
        } else {
            colorBuffer32[offset] = toColor32(
                srcColor[0],
                srcColor[1],
                srcColor[2],
                srcColor[3],
                isColorBufferLittleEndian,
            );
        }


        if (depthWriteEnabled) {
            depthBuffer[offset] = z;
        }
    };

    // INIT
    const rasterFunctions = createRasterFunctions({ depthTest, writePixel });
    createBuffers();

    return {
        resize: createBuffers,
        get uniforms() { return rasterFunctions.uniforms; },
        set uniforms(value) { rasterFunctions.uniforms = value; },
        get fragShader() { return rasterFunctions.fragShader; },
        set fragShader(value) { rasterFunctions.fragShader = value; },
        get cullFace() { return cullFace; },
        set cullFace(value) { cullFace = Math.sign(value); },
        get blendEnabled() { return blendEnabled; },
        set blendEnabled(value) { blendEnabled = !!value; },
        get depthWriteEnabled() { return depthWriteEnabled; },
        set depthWriteEnabled(value) { depthWriteEnabled = !!value; },
        get depthFunc() { return depthFunc; },
        set depthFunc(value) {
            if (value in testFunctions) {
                depthFuncRef = testFunctions[value];
                depthFunc = value;
            } else {
                console.warn(`invalid depthFunc value ${value}`);
            }
        },
        get blendSrcFunctionRGB() { return blendSrcFunctionRGB; },
        set blendSrcFunctionRGB(value) {
            if (value in blendFunctionsRGB) {
                blendSrcFunctionRGB = value;
                blendSrcFunctionRGBRef = blendFunctionsRGB[value];
            } else {
                console.warn(`invalid blendSrcFunctionRGB value ${value}`);
            }
        },
        set blendSrcFunctionRGBA(value) {
            if (value in blendFunctionsRGB) {
                blendSrcFunctionRGB = value;
                blendSrcFunctionAlpha = value;
                blendSrcFunctionRGBRef = blendFunctionsRGB[value];
                blendSrcFunctionAlphaRef = blendFunctionsRGB[value];
            } else {
                console.warn(`invalid blendSrcFunctionRGBA value ${value}`);
            }
        },
        get blendDstFunctionRGB() { return blendDstFunctionRGB; },
        set blendDstFunctionRGB(value) {
            if (value in blendFunctionsRGB) {
                blendDstFunctionRGB = value;
                blendDstFunctionRGBRef = blendFunctionsRGB[value];
            } else {
                console.warn(`invalid blendDstFunctionRGB value ${value}`);
            }
        },
        set blendDstFunctionRGBA(value) {
            if (value in blendFunctionsRGB) {
                blendDstFunctionRGB = value;
                blendDstFunctionAlpha = value;
                blendDstFunctionRGBRef = blendFunctionsRGB[value];
                blendDstFunctionAlphaRef = blendFunctionsRGB[value];
            } else {
                console.warn(`invalid blendDstFunctionRGBA value ${value}`);
            }
        },
        get blendSrcFunctionAlpha() { return blendSrcFunctionAlpha; },
        set blendSrcFunctionAlpha(value) {
            if (value in blendFunctionsAlpha) {
                blendSrcFunctionAlpha = value;
                blendSrcFunctionAlphaRef = blendFunctionsAlpha[value];
            } else {
                console.warn(`invalid blendSrcFunctionAlpha value ${value}`);
            }
        },
        get blendDstFunctionAlpha() { return blendDstFunctionAlpha; },
        set blendDstFunctionAlpha(value) {
            if (value in blendFunctionsAlpha) {
                blendDstFunctionAlpha = value;
                blendDstFunctionAlphaRef = blendFunctionsAlpha[value];
            } else {
                console.warn(`invalid blendDstFunctionAlpha value ${value}`);
            }
        },
        get blendEquationRGB() { return blendEquationRGB; },
        set blendEquationRGB(value) {
            if (value in blendEquationsRGB) {
                blendEquationRGB = value;
                blendEquationRGBRef = blendEquationsRGB[value];
            } else {
                console.warn(`invalid blendEquationRGB value ${value}`);
            }
        },
        get blendEquationAlpha() { return blendEquationAlpha; },
        set blendEquationAlpha(value) {
            if (value in blendEquationsAlpha) {
                blendEquationAlpha = value;
                blendEquationAlphaRef = blendEquationsAlpha[value];
            } else {
                console.warn(`invalid blendEquationAlpha value ${value}`);
            }
        },
        get blendColor() { return blendColor; },
        set blendColor(color) {
            blendColor[0] = clamp(color[0], 0, 1);
            blendColor[1] = clamp(color[1], 0, 1);
            blendColor[2] = clamp(color[2], 0, 1);
            blendColor[3] = clamp(color[3], 0, 1);
        },
        clear(color = DEFAULT_CLEAR_COLOR, depth = 1) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            colorBuffer32.fill(toColor32(color[0], color[1], color[2], color[3], isColorBufferLittleEndian));
            depthWriteEnabled && depthBuffer.fill(clamp((depth * MAX_DEPTH) | 0, 0, MAX_DEPTH));
            count = 0;
        },
        flush() {
            ctx.putImageData(pixelData, 0, 0);
            return count;
        },
        get width() { return width; },
        get height() { return height; },
        get viewport() { return viewport; },
        set viewport(value) { viewport = value; },
        rasterLine(v0, v1) {
            if(!clipLine(v0, v1)) return;

            toDeviceCoords(vertex0.position, v0.position);
            toDeviceCoords(vertex1.position, v1.position);

            vertex0.attrs = v0;
            vertex1.attrs = v1;

            rasterFunctions.drawLine(vertex0, vertex1);
            count++;
        },
        rasterTriangle(v0, v1, v2) {
            const triangleFan = clipTrangle(v0, v1, v2);
            const { length: vertexCount } = triangleFan;

            for(let i = 1; i < vertexCount - 1; i += 1) {
                const v0 = triangleFan[0];
                const v1 = triangleFan[i];
                const v2 = triangleFan[i + 1];
                
                toDeviceCoords(vertex0.position, v0.position);
                toDeviceCoords(vertex1.position, v1.position);
                toDeviceCoords(vertex2.position, v2.position);

                if (isFrontFace(vertex0.position, vertex1.position, vertex2.position) === -cullFace) {
                    continue;
                }

                vertex0.attrs = v0;
                vertex1.attrs = v1;
                vertex2.attrs = v2;

                rasterFunctions.fillTriangle(vertex0, vertex1, vertex2);
                count++;
            }
        },
    };
};
