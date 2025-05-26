import { Node, Component } from "cc";

export class NodeHelper {
    /**  */
    public static getComponentInParent<T extends Component>(node: Node, component: Constructor<T>): T | null {
        while (node) {
            let comp = node.getComponent(component);
            if (comp) return comp;
            node = node.parent!;
        }
        return null;
    }

    /**  */   
    public static showChildeNode(node: Node, names: string[]): Node[] {
        const nodes: Node[] = [];
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (names.includes(child.name)) {
                child.active = true;
                nodes.push(child);
            } else {
                child.active = false;
            }
        }
        return nodes;
    }
    
    /**  */
    public static getChildsName(node: Node): string[] {
        const names: string[] = [];
        for (let i = 0; i < node.children.length; i++) {
            names.push(node.children[i].name);
        }
        return names;
    }
}
