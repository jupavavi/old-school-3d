import GameObject from "./GameObject";

export default (() => {
    let debug = false;
    // object in scene
    let gameObjects = [];
    // objects to add to the scene
    let gameObjectsToAppend = [];
    // objects to remove from the scene
    let gameObjectsToDestroy = [];

    const append = gameObject => gameObjectsToAppend.push(gameObject);
    const destroy = gameObjectOrName => gameObjectsToDestroy.push(gameObjectOrName);
    const addGameObject = gameObject => gameObjects.push(gameObject);

    // removes gameObject and its descendants
    const removeGameObject = (gameObjectOrName) => {
        const filter = (typeof gameObjectOrName === "string")
            ? ({ name }) => name === gameObjectOrName
            : g => g === gameObjectOrName;

        const objectToDelete = gameObjects.find(filter);

        if (objectToDelete) {
            // deletes all descendants
            objectToDelete.transform.children.forEach((transform) => removeGameObject(transform.gameObject));

            // just in case circular reference garbage collection
            // is not proper implemented in the host JS VM
            delete objectToDelete.transform.gameObject;
            objectToDelete.destroy();
            gameObjects = gameObjects.filter(g => g !== objectToDelete);
        }
    };

    const create = ({
        children = [],
        name,
        tag,
        layer,
        behaviours,
    }) => {
        children = children.map(child => create(child));
        const gameObject = new GameObject(name, behaviours, children);
        gameObject.tag = tag;
        gameObject.layer = layer;
        append(gameObject);
        return gameObject;
    };

    const clearAll = () => {
        gameObjects = [];
        gameObjectsToAppend = [];
        gameObjectsToDestroy = [];
    };

    const find = (find = $ => $) => gameObjects.find(find);
    const findAll = (find = $ => $) => gameObjects.filter(find);
    const findByName = (name) => gameObjects.find(obj => obj.name === name);
    const findAllByTag = (tag) => gameObjects.filter(obj => obj.tags.includes(tag));

    const processAll = () => {
        // appends new game objects before update loop
        gameObjectsToAppend.forEach(addGameObject);
        gameObjectsToAppend = [];

        // remove pendeing objects
        gameObjectsToDestroy.forEach(removeGameObject);
        gameObjectsToDestroy = [];

        gameObjects.forEach((gameObject) => {
            if (!gameObject.active) return;
            // start must always be call before update
            gameObject.awake(); // awake uninitialized behaviours if any
            gameObject.start(); // starts unstarted behaviours if any
            gameObject.update();
            gameObject.afterUpdate();
            gameObject.fixedUpdate(); // TODO: should be called on a fixed loop
            gameObject.afterFixedUpdate(); // TODO: should be called on a fixed loop
        });
    };

    return {
        create,
        processAll,
        clearAll,
        destroy,
        find,
        findAll,
        findByName,
        findAllByTag,
        get debug() { return debug; },
        set debug(value) { debug = value; },
    };
})();