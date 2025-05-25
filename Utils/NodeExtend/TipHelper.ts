import { tips } from "db://assets/script/game/common/prompt/TipsManager";

export default class TipHelper {
    static showTip() {
        tips.confirm("", () => {
        }, "", () => {
        }, "", false);
    }
}
