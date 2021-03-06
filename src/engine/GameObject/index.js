import GameObject from "./GameObject";

const identity = $ => $;

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

    const update = (filter = identity) => {
        // appends new game objects before update loop
        gameObjectsToAppend.forEach(addGameObject);
        gameObjectsToAppend = [];

        // remove pendeing objects
        gameObjectsToDestroy.forEach(removeGameObject);
        gameObjectsToDestroy = [];

        gameObjects
            .filter(identity)
            .forEach((gameObject) => {
                gameObject.awake(); // awakes non-awaken behaviours if any
                if (!gameObject.active) return;
                gameObject.start(); // starts unstarted behaviours if any
                gameObject.update();
                gameObject.afterUpdate();
                gameObject.fixedUpdate(); // TODO: should be called on a fixed loop
                gameObject.afterFixedUpdate(); // TODO: should be called on a fixed loop
            });
    };

    return {
        create,
        update,
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
