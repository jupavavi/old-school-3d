import GameObject from "./GameObject";

const identity = $ => $;

export default class GameObjectCollection {
    // object in scene
    #gameObjects = [];
    // objects to add to the scene
    #gameObjectsToAppend = [];
    // objects to remove from the scene
    #gameObjectsToDestroy = [];
    #engine = null;

    constructor(engine) {
        this.#engine = engine;
    }

    #append = (gameObject) => this.#gameObjectsToAppend.push(gameObject);
    #addGameObject = (gameObject) => this.#gameObjects.push(gameObject);
    #removeGameObject = (gameObjectOrName) => {
        const filter = (typeof gameObjectOrName === "string")
            ? ({ name }) => name === gameObjectOrName
            : g => g === gameObjectOrName;

        const objectToDelete = this.#gameObjects.find(filter);

        if (objectToDelete) {
            // deletes all descendants
            objectToDelete.transform.children.forEach((transform) => this.#removeGameObject(transform.gameObject));

            objectToDelete.destroy();
            this.#gameObjects = this.#gameObjects.filter(g => g !== objectToDelete);
        }
    }

    create({ children = [], ...rest}) {
        children = children.map(child => this.create(child));
        const gameObject = new GameObject({ ...rest, engine: this.#engine, children });
        this.#append(gameObject);
        return gameObject;
    }

    destroy(gameObjectOrName) {
        this.#gameObjectsToDestroy.push(gameObjectOrName);
    }

    clearAll() {
        this.#gameObjects = [];
        this.#gameObjectsToAppend = [];
        this.#gameObjectsToDestroy = [];
    }

    find(findFn = identity) {
        return this.#gameObjects.find(findFn);
    }

    findAll(filterFn = identity) {
        return this.#gameObjects.filter(filterFn);
    }

    findByName(name) {
        return this.#gameObjects.find(obj => obj.name === name);
    }

    findAllByTag(tag) {
        return this.#gameObjects.filter(obj => obj.tags.includes(tag));
    }

    update(filter = identity) {
        // appends new game objects before update loop
        this.#gameObjectsToAppend.forEach(this.#addGameObject);
        this.#gameObjectsToAppend = [];

        // remove pendeing objects
        this.#gameObjectsToDestroy.forEach(this.#removeGameObject);
        this.#gameObjectsToDestroy = [];

        this.#gameObjects
            .filter(filter)
            .forEach((gameObject) => {
                gameObject.awake(); // awakes non-awaken behaviours if any
                if (!gameObject.active) return;
                gameObject.start(); // starts unstarted behaviours if any
                gameObject.update();
                gameObject.afterUpdate();
            });
    }

    fixedUpdate(filter = identity) {
        this.#gameObjects
            .filter(identity)
            .forEach((gameObject) => {
                gameObject.fixedUpdate();
                gameObject.afterFixedUpdate();
            });
    }

    forEach(forEachFn) {
        this.#gameObjects.forEach(forEachFn);
    }
}
