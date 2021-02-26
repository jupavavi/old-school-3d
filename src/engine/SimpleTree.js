const removeItem = (array, item) => {
    const index = array.indexOf(item);
    if (index >= 0) {
        array.splice(index, 1);
    }
};
const addItem = (array, item) => {
    const index = array.indexOf(item);
    if (index < 0) {
        array.push(item);
    }
};

export default class SimpleTree {
    #parent = null;
    #children = [];
    name = "";
    constructor(name) {
        this.name = name;
    }

    get children() { return this.#children; }
    get parent() { return this.#parent; }
    set parent(newParent) {
        if (newParent === this.#parent) return; // trivial case
        const protoOfThis = Object.getPrototypeOf(this);
        if (newParent && Object.getPrototypeOf(newParent) !== protoOfThis) {
            throw new Error(`parent must be instance of ${protoOfThis.constructor.name}`);
        }
        if (this.#parent) {
            removeItem(this.#parent.#children, this);
        }
        this.#parent = newParent;
        if (this.#parent) {
            addItem(this.#parent.#children, this);
        }
    }
    find(path) {
        const parts = path.split("/").filter($ => $);
        const thisLevel = parts[0];

        const matchedChild = this.children.find(({ name }) => name === thisLevel);
        if (parts.length > 1) {
            return matchedChild.find(parts.slice(1).join("/"));
        }
        return matchedChild;
    }
};
