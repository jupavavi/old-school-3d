import RenderEngine from "./RenderEngine";
import GameObjectCollection from "./GameObjectCollection";
import RendererBehaviour from "./behaviours/Renderer";

const rendereableForEach = (gameObject) => {
    const rederers = gameObject.getBehaviours(RendererBehaviour);

    const { length } = rederers;

    for (let r = 0; r < length; r += 1) {
        rederers[r].render();
    }
};

const deferredRendereableForEach = (gameObject) => {
    const rederers = gameObject.getBehaviours(RendererBehaviour);

    const { length } = rederers;

    for (let r = 0; r < length; r += 1) {
        rederers[r].render(true);
    }
};

export default class Engine {
    debug = false;
    #renderer = null;
    #gameObjectCollection = null;

    #time = {
        startTime: null, // the time mark for begenning of the game
        elapsedtime: 0, // the time in seconds since the start of the game.
        deltaTime: 0, // time last frame took to render, the most important data
        frameCount: 0, // frame count since game started
    };

    #mouse = {
        x: 0,
        y: 0,
        movementX: 0,
        movementY: 0,
        buttons: 0,
    };

    #keys = {};

    constructor(ctx) {
        this.#renderer = new RenderEngine(ctx);
        this.#gameObjectCollection = new GameObjectCollection(this);
    }

    get renderer() { return this.#renderer; }
    get time() { return this.#time; }
    get mouse() { return this.#mouse; }
    get keys() { return this.#keys; }

    createGameObject(gameObjectdata) {
        return this.#gameObjectCollection.create(gameObjectdata);
    }

    update({ time, keys, mouse }) {
        Object.assign(this.time, time);
        Object.assign(this.keys, keys);
        Object.assign(this.mouse, mouse);
        this.#gameObjectCollection.update();
    }

    fixedUpdate({ time, keys, mouse }) {
        return this.#gameObjectCollection.fixedUpdate();
    }

    render() {
        this.renderer.clear();
        // TODO: this can be optimized
        this.#gameObjectCollection.forEach(rendereableForEach);
        this.#gameObjectCollection.forEach(deferredRendereableForEach);
    }


    clearAllGameObjects() {
        return this.#gameObjectCollection.clearAll();
    }

    destroyGameObject(gameObjectOrName) {
        return this.#gameObjectCollection.destroy(gameObjectOrName);
    }

    find(findFn) {
        return this.#gameObjectCollection.find(findFn);
    }

    findAll(filterFn) {
        return this.#gameObjectCollection.findAll(filterFn);
    }

    findByName(name) {
        return this.#gameObjectCollection.findByName(name);
    }

    findAllByTag(tag) {
        return this.#gameObjectCollection.findAllByTag(tag);
    }

    get debug() { return this.#gameObjectCollection.debug; }
    set debug(value) { this.#gameObjectCollection.debug = value; }
}
