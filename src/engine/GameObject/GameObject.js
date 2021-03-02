import Transform from "../Transform";

export default class GameObject {
    #transform = null;
    #nonInitializedBehaviours = [];
    #nonStartedBehaviours = [];
    #behaviours = [];
    #active = false;
    tag = "";
    layer = 0;

    constructor(name, behaviours, children) {
        this.#transform = new Transform(name);

        Object.defineProperty(this.#transform, "gameObject", {
            value: this,
            writable: false, // read-only access
            enumerable: true,
            configurable: true, // allows transform to be deleted - internal use only
        });

        // eslint-disable-next-line no-unused-expressions
        children?.forEach((child) => child.transform.parent = this.#transform);

        this.#nonInitializedBehaviours = behaviours?.map(({ data, constructor }) => {
            const behaviour = new constructor(this);
            return Object.assign(behaviour, data);
        });
    }

    get transform() { return this.#transform; }
    get name() { return this.transform.name; }
    set name(value) { this.transform.name = value; }
    get active() { return this.#active; }

    awake() {
        if (!this.active) return;
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