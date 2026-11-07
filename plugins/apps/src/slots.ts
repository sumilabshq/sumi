import type { ComponentType } from "react";
import { z } from "zod";
import type { DeviceModule } from "@widgetarium/data-framework";
import { slot } from "@widgetarium/plugin-framework";
import { isComponent } from "./features/app-tab/lib/is-component.js";

export interface AppViewProps {
	readonly tabId: string;
}

export type AppView = ComponentType<AppViewProps>;

export type TabModulesOf = () => readonly DeviceModule[];

const NOT_A_VIEW = "an app's view is a React component that takes { tabId }";
const NOT_AN_ACTION = "an app's header action is a React component that takes { tabId }";
const NOT_MODULES = "an app's tab modules are a function answering the modules each of its tabs runs";
const NOT_AN_SVG = "an app's icon is the markup of its own SVG, starting with <svg";
const ICON_LIMIT = 32_768;

export const AppSchema = z.object({
	title: z.string().min(1),
	icon: z
		.string()
		.max(ICON_LIMIT)
		.regex(/^<svg[\s>]/, NOT_AN_SVG),
	view: z.custom<AppView>(isComponent, NOT_A_VIEW),
	actions: z.array(z.custom<AppView>(isComponent, NOT_AN_ACTION)).optional(),
	tabModules: z.custom<TabModulesOf>((value) => typeof value === "function", NOT_MODULES).optional(),
});

export const AppsSlot = slot("apps").item(AppSchema).list();
