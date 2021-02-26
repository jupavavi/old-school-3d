import "./styles.css";
import init from "./init";
import test1 from "./test1";
import scene1 from "./scene1";
import scene2 from "./scene2";
import scene3 from "./scene3";
import scene4 from "./scene4";

const parseQuery = (search) => {
    const args = search.substring(1).split('&');
    const argsParsed = {};
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (-1 === arg.indexOf('=')) {
            argsParsed[decodeURIComponent(arg).trim()] = true;
        }
        else {
            const kvp = arg.split('=');
            const key = decodeURIComponent(kvp[0]).trim();
            const value = decodeURIComponent(kvp[1]).trim();
            argsParsed[key] = value;
        }
    }

    return argsParsed;
};

const scenes = {
    test1,
    scene1,
    scene2,
    scene3,
    scene4,
    default: scene2,
};

const { scene } = parseQuery(window.location.search);
const selectedScene = scenes[scene] || scenes.default;

init({
    element: document.getElementById("app"),
    gameConstructor: selectedScene,
    debugMode: true,
});
