export default class Behaviour {
    #gameObject = null;
    #enabled = true;

    constructor(gameObject) {
        this.#gameObject = gameObject;
    }

    get gameObject() { return this.#gameObject; }
    get transform() { return this.gameObject.transform; }
    get name() { return this.gameObject.name; }
    set name(value) { this.gameObject.name = value; }
    get enabled() { return this.#enabled; }
    set enabled(value) { this.#enabled = value; }

    get activeAndEnabled() { return this.enabled && this.gameObject.active }

    awake() {}
    start() {}
    update() {}
    afterUpdate() {}
    fixedUpdate() {}
    afterFixedUpdate() {}
    onDestroy() {}
}
