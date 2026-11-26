import type { ComponentType } from "react";

export interface SettingsSectionEntry {
	readonly id: string;
	readonly title: string;
	readonly description?: string | undefined;
	readonly keywords?: readonly string[] | undefined;
	readonly sections?: readonly SettingsSectionEntry[] | undefined;
}

export interface SettingsPageEntry {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly section: string;
	readonly order: number;
	readonly description?: string | undefined;
	readonly keywords?: readonly string[] | undefined;
	readonly sections?: readonly SettingsSectionEntry[] | undefined;
	readonly view: ComponentType;
}
