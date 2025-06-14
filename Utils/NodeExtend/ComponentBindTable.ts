import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

// Constructor
type Constructor<T> = new () => T;

@ccclass('NodeExtend/ComponentBindData')
class ComponentBindData
{
    @property(String)
    public compName: string = "";
    @property(Node)
    public compNode: Node = null!;
}

@ccclass('NodeExtend/ComponentBindTable')
export class ComponentBindTable extends Component {
    
    @property([ComponentBindData])
    private data: ComponentBindData[] = [];

    //  Map
    private dataMap: Map<string, ComponentBindData> = new Map();

    private init()
    {
        if (this.data.length == this.dataMap.size) return;
        this.dataMap.clear();
        for (const item of this.data)
        {
            this.dataMap.set(item.compName, item);
        }
    }

    public add(name: string, node: Node): void
    {
        if (this.dataMap.has(name)) return;
        const bindData = new ComponentBindData();
        bindData.compName = name;
        bindData.compNode = node;
        this.data.push(bindData);
        this.dataMap.set(name, bindData);
    }


    /**
     * 
     * @param name 
     * @param componentClass 
     * @returns null
     */
    public get<T extends Component>(name: string, componentClass: Constructor<T>): T | null
    {
        this.init();
        const data = this.dataMap.get(name);
        if (!data)
        {
            return null;
        }
        
        return data.compNode.getComponent(componentClass) as T;
    }
}