import { tips } from "db://assets/script/game/common/prompt/TipsManager";
import { oops } from "db://oops-framework/core/Oops";

export default class TipHelper {
    /**  */
    static showDevTip() {
        tips.confirm("", () => {
        }, "", () => {
        }, "", false);
        oops.gui.waitClose();
    }
}
