import "./gameCanvas.css";
import { glMatrix } from "gl-matrix";

glMatrix.setMatrixArrayType(Array);

const MAX_WIDTH = 256;
const MAX_HEIGHT = 224;

const debugDiv = `
    <span class="game-canvas-debug__text game-canvas-debug__fps"></span>
    <span class="game-canvas-debug__text game-canvas-debug__afps"></span>
    <span class="game-canvas-debug__text game-canvas-debug__frames"></span>
`;

const createDebugPanel = (target) => {
    const element = document.createElement("div");
    element.classList.add("game-canvas-debug");
    element.innerHTML = debugDiv;
    const fbsElement = element.querySelector(".game-canvas-debug__fps");
    const afbsElement = element.querySelector(".game-canvas-debug__afps");
    // const framesElement = element.querySelector(".game-canvas-debug__frames");
    target.appendChild(element);

    return {
        update(time) {
            const fps = 1 / time.deltaTime; // frames per second
            const avgFps = time.frameCount / (time.elapsedtime - time.startTime);
            fbsElement.textContent    = `fps: ${Math.round(fps)}`;
            afbsElement.textContent   = `afps: ${Math.round(avgFps)}`;
            // framesElement.textContent = `frames: ${time.frameCount}`;
        },
    };
}

export default ({ element, gameConstructor, debugMode = false }) => {
    const canvas = document.createElement("canvas");
    let debugPanel = null;
    canvas.classList.add("game-canvas");
    element.appendChild(canvas);
    canvas.tabIndex = 0;
    canvas.id = "canvas";
    if (!debugMode) {
        canvas.focus();
    }
    else {
        debugPanel = createDebugPanel(element);
    }

    // key dictionary
    const keys = {};
    canvas.addEventListener('keydown', (event) => keys[event.code] = true); // marks the pressed key as true
    canvas.addEventListener('keyup', (event) => keys[event.code] = false); // marks the unpressed key as false

    const mouse = {
        x: 0,
        y: 0,
        movementX: 0,
        movementY: 0,
        buttons: 0,
    };
    canvas.addEventListener('mousemove', (event) => {
        const { target, clientX, clientY, movementX, movementY } = event;
        const { left, top } = target.getBoundingClientRect();

        mouse.x = clientX - left;
        mouse.y = clientY - top;
        mouse.movementX = movementX;
        mouse.movementY = movementY;
    });

    canvas.addEventListener('contextmenu', (event) => !!event.preventDefault()); // prevents right-click context menu
    canvas.addEventListener('mousedown', (event) => mouse.buttons = event.buttons);
    canvas.addEventListener('mouseup', (event) => mouse.buttons = event.buttons);

    let animationFrameId = null;

    
    const game = new gameConstructor(canvas);
    cancelAnimationFrame(animationFrameId);

    const time = {
        startTime: null, // the time mark for begenning of the game
        elapsedtime: 0, // the time in seconds since the start of the game.
        deltaTime: 0, // time last frame took to render, the most important data
        frameCount: 0, // frame count since game started
    };

    // resets mouse position to the middle of the canvas
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;

    const resize = () => {
        const pixelWidth = canvas.clientWidth /* * window.devicePixelRatio */;
        const pixelHeight = canvas.clientHeight /* * window.devicePixelRatio */;
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            if (pixelWidth > pixelHeight) {
                canvas.width = MAX_WIDTH;
                canvas.height = MAX_WIDTH * canvas.clientHeight / canvas.clientWidth;
            } else {
                canvas.width = MAX_HEIGHT * canvas.clientWidth / canvas.clientHeight;
                canvas.height = MAX_HEIGHT;
            }
            // canvas.width = 0.5 * pixelWidth;
            // canvas.height = 0.5 * pixelHeight;

            game.resize({ width: canvas.width, height: canvas.height });
        }
    };

    // this is the game loop
    const gameLoop = (timestamp = 0) => {
        resize();

        const now = timestamp * 0.001; // to senconds
        if (time.startTime === null) {
            time.startTime = now;
        }
        
        time.deltaTime = now - time.elapsedtime;
        time.elapsedtime = now;
        time.frameCount++;

        game.render({ time, keys, mouse });

        if (debugPanel) {
            debugPanel.update(time);
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);
    
};

