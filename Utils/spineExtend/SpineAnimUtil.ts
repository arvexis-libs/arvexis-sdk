    import { sp } from 'cc';
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpineAnimUtil')
export class SpineAnimUtil extends Component {

    @property({ type: [String] })
    anims: string[] = [];

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null!;

    /*  */
    @property
    index: number = 0;
    /*  */
    @property
    track: number = 0;
    /*  */
    @property
    printLog: boolean = true;

    start() {
        const skeleton = this.getComponent(sp.Skeleton);
        if (skeleton) {
            this.skeleton = skeleton;
        } else {
            console.warn('SpineAnimTUtil:  sp.Skeleton ');
            return;
        }
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
    }

    public setAnimByName(animName: string, loop: boolean = true) {
        if (!this.skeleton) return;
        if (this.printLog) {
            console.log(`SpineAnimUtil, ${this.node.name}, animName:${animName}, index:${this.index}, : ${loop}`);
        }
        this.skeleton.setAnimation(this.track, animName, loop);
    }

    public setAnim(index: number, loop: boolean = true) {
        // indexanims
        if (index < 0 || index >= this.anims.length) {
            console.warn('SpineAnimTUtil: ');
            return;
        }
        this.setAnimByName(this.anims[index], loop);
    }

    /*  */
    private setNextAnim() {
        this.index++;
        if (this.index >= this.anims.length) {
            this.index = 0;
        }
        this.setAnim(this.index, true);
    }

    /*  */
    onClick() {
        this.setNextAnim();
    }
}