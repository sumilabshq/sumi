import type { ComponentType } from "react";
import { z } from "zod";
import { plugin, slot } from "@widgetarium/plugin-framework";

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

export interface PluginApp extends z.infer<typeof AppSchema> {
	readonly id: string;
}

export const AppsSlot = slot("apps").item(AppSchema).list();

export const AppsPlugin = plugin("apps").declare(AppsSlot);

function isComponent(value: unknown): boolean {
	return typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);
}
