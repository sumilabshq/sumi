import type { ComponentType } from "react";
import type { DeviceModule } from "@widgetarium/data-framework";

export interface AppViewProps {
	readonly tabId: string;
}

export type AppView = ComponentType<AppViewProps>;

export interface ModulesTab {
	readonly tabId: string;
}

export type TabModulesOf = (tab: ModulesTab) => readonly DeviceModule[];

export type TitleOf = (address: string) => string;

export type ArtOf = (address: string) => string | null;

export type HandoffAppOf = (address: string) => string | null;

export interface TabRules {
	readonly isChat?: boolean | undefined;
	readonly navigates?: boolean | undefined;
	readonly splits?: boolean | undefined;
	readonly runsInPage?: boolean | undefined;
	readonly keepsRecord?: boolean | undefined;
}
