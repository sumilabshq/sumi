import type { ComponentType } from "react";
import { z } from "zod";
import { AppsModule as AppsContract } from "@sumi/apps";
import { AppsModule } from "@sumi/apps/module";
import { SharedModulesSlot, SumiHostPlugin, TabPageSlot } from "@sumi/sumi-host-plugin";
import { plugin, slot } from "@widgetarium/plugin-framework";
import { appsTabPageOf } from "./apps-tab-page.js";

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

export const AppsPlugin = plugin("apps")
	.require(SumiHostPlugin)
	.declare(AppsSlot)
	.fill(
		SharedModulesSlot({
			id: "apps",
			module: ({ fillsOf }) =>
				AppsModule({ apps: fillsOf(AppsSlot).map(({ id, title, icon }) => ({ id, title, icon })) }),
			contract: AppsContract,
		}),
		TabPageSlot({ tabPage: ({ fillsOf }) => appsTabPageOf(fillsOf(AppsSlot)) }),
	);

function isComponent(value: unknown): boolean {
	return typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);
}
