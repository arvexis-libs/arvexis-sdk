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

    @property(Boolean)
    clickSwitch: boolean = false;

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

    protected onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
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

    /**  */
    public setNextAnim(): void {
        this.index++;
        if (this.index >= this.anims.length) {
            this.index = 0;
        }
        this.setAnim(this.index, true);
    }

    /*  */
    private onClick() {
        if (!this.clickSwitch) return;
        this.setNextAnim();
    }

    /* skeleton */
    private get getSkeletonAnimNames(): string[] {
        if (!this.skeleton) return [];
        const animsEnum = this.skeleton.skeletonData?.getAnimsEnum()!;
        if (!animsEnum) return [];
        // animsEnum
        const animNames: string[] = [];
        for (const key in animsEnum) {
            if (key == "<None>") continue;
            animNames.push(key);
        }
        return animNames;
    }

    /* , animsskeleton */
    public get getAnimNames(): string[] {
        if (this.anims.length > 0) return this.anims;
        this.anims = this.getSkeletonAnimNames;
        return this.anims;
    }
}