import type { ComponentType } from "react";

export interface SettingsPage {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly group: "sumi" | "extend";
	readonly order: number;
	readonly keywords?: readonly string[] | undefined;
	readonly view: ComponentType;
}
