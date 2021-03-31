import Transform from "./Transform";

export default class GameObject {
    #transform = null;
    #nonInitializedBehaviours = [];
    #nonStartedBehaviours = [];
    #behaviours = [];
    #active = false;
    #engine = null;
    tag = "";
    layer = 0;

    constructor({ name, behaviours, children, engine, transform }) {
        this.#transform = new Transform(name);
        this.#engine = engine;

        Object.defineProperty(this.#transform, "gameObject", {
            value: this,
            writable: false, // read-only access
            enumerable: true,
            configurable: true, // allows transform to be deleted - internal use only
        });
        Object.assign(this.#transform, transform);

        // eslint-disable-next-line no-unused-expressions
        children?.forEach((child) => child.transform.parent = this.#transform);

        this.#nonInitializedBehaviours = behaviours?.map(({ data, constructor }) => {
            const behaviour = new constructor(this);
            return Object.assign(behaviour, data);
        });
    }

    get transform() { return this.#transform; }
    get engine() { return this.#engine; }
    get name() { return this.transform.name; }
    set name(value) { this.transform.name = value; }
    get active() { return this.#active; }

    awake() {
        while (this.#nonInitializedBehaviours.length > 0) {
            const behaviour = this.#nonInitializedBehaviours.pop();
            behaviour.awake();
            this.#nonStartedBehaviours.push(behaviour);
        }
    }
    start() {
        if (!this.active) return;
        while (this.#nonStartedBehaviours.length > 0) {
            const behaviour = this.#nonStartedBehaviours.pop();
            behaviour.start();
            this.#behaviours.push(behaviour);
        }
    }
    update() {
        if (!this.active) return;
        const behaviours = this.#behaviours;
        for (let behaviour of behaviours) {
            if (!behaviour.enabled) continue;
            behaviour.update();
        }
    }
    afterUpdate() {
        if (!this.active) return;
        const behaviours = this.#behaviours;
        for (let behaviour of behaviours) {
            if (!behaviour.enabled) continue;
            behaviour.afterUpdate();
        }
    }
    fixedUpdate() {
        if (!this.active) return;
        const behaviours = this.#behaviours;
        for (let behaviour of behaviours) {
            if (!behaviour.enabled) continue;
            behaviour.fixedUpdate();
        }
    }
    afterFixedUpdate() {
        if (!this.active) return;
        const behaviours = this.#behaviours;
        for (let behaviour of behaviours) {
            if (!behaviour.enabled) continue;
            behaviour.afterFixedUpdate();
        }
    }

    destroy() {
        const behaviours = this.#behaviours;
        for (let behaviour of behaviours) {
            behaviour.onDestroy();
        }
        // just in case circular reference garbage collection
        // is not proper implemented in the host JS VM
        delete this.#transform.gameObject;
    }

    addBehaviour(BehaviourType) {
        this.#nonInitializedBehaviours.push(new BehaviourType(this));
    }
    getBehaviour(BehaviourType) {
        return this.#behaviours.find(behaviour => BehaviourType.isPrototypeOf(behaviour));
    }
    getBehaviours(BehaviourType) {
        return this.#behaviours.filter(behaviour => BehaviourType.isPrototypeOf(behaviour));
    }
}