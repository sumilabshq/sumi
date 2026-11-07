import type { ComponentType } from "react";
import { z } from "zod";
import { slot } from "@widgetarium/plugin-framework";
import { isComponent } from "./features/app-tab/lib/is-component.js";

export interface AppViewProps {
	readonly tabId: string;
}

export type AppView = ComponentType<AppViewProps>;

const NOT_A_VIEW = "an app's view is a React component that takes { tabId }";
const NOT_AN_SVG = "an app's icon is the markup of its own SVG, starting with <svg";
const ICON_LIMIT = 32_768;

export const AppSchema = z.object({
	title: z.string().min(1),
	icon: z
		.string()
		.max(ICON_LIMIT)
		.regex(/^<svg[\s>]/, NOT_AN_SVG),
	view: z.custom<AppView>(isComponent, NOT_A_VIEW),
});

export const AppsSlot = slot("apps").item(AppSchema).list();
