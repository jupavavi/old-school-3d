import { getTexture2DFrag } from "../utils";

export default ({ color, uv }, { text1 = {}, textScale = 1 }) => {
    const texsel = getTexture2DFrag(text1, uv[0] * textScale, uv[1] * textScale);

    color[0] *= texsel[0];
    color[1] *= texsel[1];
    color[2] *= texsel[2];
    color[3] *= texsel[3];

    return color;
};
