import type { PxMemory } from "@widgetarium/behaviors";
import type { HeldSettings } from "./settings-doc.js";

export type PxSetting = "chatWidthPx" | "leftWidthPx";

export function settingsPxMemory(settings: HeldSettings, setting: PxSetting): PxMemory {
	return {
		read: () => settings.now()[setting],
		write: (px) =>
			settings.change(
				{
					[setting]: px,
				},
				`${setting} ${px}px`,
			),
	};
}
