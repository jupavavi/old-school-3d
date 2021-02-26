export const numberToDefault = (value, fallback = 0) => (
    Number.isNaN(value * 1) ? fallback : value
);
export const clamp = (num, min, max) => Math.max(min, Math.min(num, max));

export const testFunctions = {
    never: () => false,
    less: (dst, src) => dst > src,
    equal: (dst, src) => dst === src,
    lequal: (dst, src) => dst >= src,
    greater: (dst, src) => dst < src,
    gequal: (dst, src) => dst <= src,
    notequal: (dst, src) => dst !== src,
    always: () => true,
};

export const toColor32 = (r, g, b, a, littleEndian = true) => {
    const rc = (r * 255) & 0xFF;
    const gc = (g * 255) & 0xFF;
    const bc = (b * 255) & 0xFF;
    const ac = (a * 255) & 0xFF;

    return littleEndian
        ? ((ac << 24) | (bc << 16) | (gc << 8) | (rc << 0)) >>> 0
        : ((rc << 24) | (gc << 16) | (bc << 8) | (ac << 0)) >>> 0;
};
