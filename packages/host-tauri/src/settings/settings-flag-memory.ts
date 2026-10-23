import type { FlagMemory } from "@widgetarium/behaviors";
import type { HeldSettings } from "./settings-doc.js";

export type FlagSetting = "leftHidden" | "rightHidden";

export function settingsFlagMemory(settings: HeldSettings, setting: FlagSetting): FlagMemory {
	return {
		read: () => settings.now()[setting],
		write: (flag) =>
			settings.change(
				{
					[setting]: flag,
				},
				`${setting} ${String(flag)}`,
			),
	};
}
