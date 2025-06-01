import { TipsNoticeUtil } from "../../../game/gameplay/Utility/TipsNoticeUtil";

export default class TipHelper {
    /**  */
    static showDevTip() {
        // tips.confirm("", () => {
        // }, "", () => {
        // }, "", false);
        // oops.gui.waitClose();
        TipsNoticeUtil.PlayNotice("");
    }
}
