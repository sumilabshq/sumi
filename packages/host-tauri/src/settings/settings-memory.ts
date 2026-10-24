import type { FlagMemory, PxMemory } from "@widgetarium/behaviors";
import type { HeldSettings } from "./settings-doc.js";

type PxSetting = "chatWidthPx" | "leftWidthPx";

type FlagSetting = "leftHidden" | "rightHidden";

interface SettingMemory<T> {
	read(): T | null;
	write(value: T): void;
}

export function settingsMemory(settings: HeldSettings, setting: PxSetting): PxMemory;
export function settingsMemory(settings: HeldSettings, setting: FlagSetting): FlagMemory;
export function settingsMemory(
	settings: HeldSettings,
	setting: PxSetting | FlagSetting,
): SettingMemory<number | boolean> {
	return {
		read: () => settings.now()[setting],
		write: (value) =>
			settings.change(
				{
					[setting]: value,
				},
				`${setting} ${String(value)}`,
			),
	};
}
