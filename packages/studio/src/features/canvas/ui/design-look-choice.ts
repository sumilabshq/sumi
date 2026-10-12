import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NativeSelect, NativeSelectOption, Segmented } from "@widgetarium/kit";
import type { LookSetting } from "@widgetarium/core/app-look.js";
import type { LookPick } from "./design-look-panel.js";

const SEGMENTS_AT_MOST = 3;

export function LookChoice({
	setting,
	onPick,
}: {
	readonly setting: LookSetting;
	readonly onPick: LookPick;
}): ReactElement {
	const pick = (option: string): void => onPick(setting.name, option);
	if (setting.options.length <= SEGMENTS_AT_MOST)
		return h(Segmented<string>, {
			size: "s",
			items: setting.options.map((option) => ({ value: option, label: option })),
			value: setting.picked,
			onValueChange: pick,
		});
	return h(
		NativeSelect,
		{ value: setting.picked, onValueChange: pick, "aria-label": setting.ask ?? setting.name },
		setting.options.map((option) => h(NativeSelectOption, { key: option, value: option }, option)),
	);
}
