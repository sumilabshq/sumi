import type { Look } from "@widgetarium/core/app-look.js";
import type { LookRow } from "../../schema/look-row.schema.js";
import { isSettingDrawnLive } from "./look-tokens.js";

const SEGMENTS_AT_MOST = 3;
const SUGGESTED = "Suggested: {option}";

export function lookRowsOf(look: Look): LookRow[] {
	return look.settings.map((setting) => ({
		name: setting.name,
		label: setting.ask ?? setting.name,
		options: [...setting.options],
		picked: setting.picked,
		isSegmented: setting.options.length <= SEGMENTS_AT_MOST,
		suggested: setting.picked === setting.recommended ? null : SUGGESTED.replace("{option}", setting.recommended),
		isRedrawn: !isSettingDrawnLive(setting.name),
	}));
}
