import type { ComponentType } from "react";
import { z } from "zod";
import { slot } from "@widgetarium/plugin-framework";
import { isComponent } from "./is-component.js";

export interface AppViewProps {
	readonly tabId: string;
}

export type AppView = ComponentType<AppViewProps>;

const NOT_A_VIEW = "an app's view is a React component that takes { tabId }";

export const AppSchema = z.object({
	title: z.string().min(1),
	icon: z.string().min(1),
	view: z.custom<AppView>(isComponent, NOT_A_VIEW),
});

export const AppsSlot = slot("apps").item(AppSchema).list();
