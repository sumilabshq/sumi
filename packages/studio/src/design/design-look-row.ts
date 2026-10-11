import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { LookSetting } from "@widgetarium/core/app-look.js";
import type { LookPick } from "./design-look-panel.js";
import { LookChoice } from "./design-look-choice.js";
import { isSettingDrawnLive } from "./look-tokens.js";

const SUGGESTED_HINT = "Suggested: {option}";
const REDRAWN_HINT = "The assistant draws this into the next screens";

export function LookRow({
	setting,
	onPick,
}: {
	readonly setting: LookSetting;
	readonly onPick: LookPick;
}): ReactElement {
	const isSuggestionLeft = setting.picked !== setting.recommended;
	return h("div", { className: "wg-design-look-row" }, [
		h("span", { key: "label", className: "wg-design-look-label" }, setting.ask ?? setting.name),
		h(LookChoice, { key: "choice", setting, onPick }),
		isSuggestionLeft
			? h(
					"span",
					{ key: "suggested", className: "wg-design-look-said" },
					SUGGESTED_HINT.replace("{option}", setting.recommended),
				)
			: null,
		isSettingDrawnLive(setting.name)
			? null
			: h("span", { key: "redrawn", className: "wg-design-look-said" }, REDRAWN_HINT),
	]);
}
