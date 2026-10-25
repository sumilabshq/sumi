import { z } from "zod";
import { HeldTabsQuery } from "@widgetarium/app-host";
import {
	CapturePageCommand,
	PageRegionSchema,
	ReadPageContentCommand,
	ShotAreaSchema,
	SiteAccessQuery,
} from "@widgetarium/browser";
import type { AccessDecision } from "@widgetarium/browser";
import { inputOf, outputOf } from "./tool-places.js";
import type { ToolContext } from "./tool-places.js";

const NO_TAB = "No tab {id} is open.";
const NO_PAGE = "The tab {id} has no page loaded.";
const SHOT_ONLY = "area and region apply only to a screenshot.";
const READ_WORDS = {
	allowed: "allowed",
	ask: "ask",
	blocked: "denied",
} as const;

const TabAccessSchema = z.strictObject({ tabId: z.string().min(1) });

const TabReadSchema = z.strictObject({
	tabId: z.string().min(1),
	as: z.enum(["text", "dom", "screenshot"]).default("text"),
	area: ShotAreaSchema.optional(),
	region: PageRegionSchema.optional(),
});

export async function tabAccess({ app }: ToolContext, input: unknown) {
	const { tabId } = inputOf(TabAccessSchema, "tab_access", input);
	const pageId = await pageIdOf({ app }, tabId);
	const { shown } = await outputOf(app.send(SiteAccessQuery, { heldTabId: pageId }));
	return accessOf(tabId, shown);
}

export async function tabRead({ app }: ToolContext, input: unknown) {
	const asked = inputOf(TabReadSchema, "tab_read", input);
	const pageId = await pageIdOf({ app }, asked.tabId);

	if (asked.as !== "screenshot" && (asked.area !== undefined || asked.region !== undefined)) {
		throw new Error(SHOT_ONLY);
	}

	if (asked.as !== "screenshot") {
		return outputOf(app.send(ReadPageContentCommand, { tabId: pageId, form: asked.as }));
	}

	return outputOf(
		app.send(CapturePageCommand, { tabId: pageId, area: asked.area ?? "viewport", region: asked.region ?? null }),
	);
}

function accessOf(tabId: string, shown: AccessDecision | null) {
	if (shown === null) {
		return {
			tabId,
			accesses: null,
			why: NO_PAGE.replace("{id}", tabId),
		};
	}

	return {
		tabId,
		site: shown.siteKey,
		accesses: { read: READ_WORDS[shown.level] },
		decision: shown.decision,
		why: shown.reason,
	};
}

async function pageIdOf({ app }: Pick<ToolContext, "app">, tabId: string): Promise<string> {
	const held = await outputOf(app.send(HeldTabsQuery));
	const tab = held.tabs.find(({ id }) => id === tabId);

	if (tab === undefined) {
		throw new Error(NO_TAB.replace("{id}", tabId));
	}

	if (tab.pageId === null) {
		throw new Error(NO_PAGE.replace("{id}", tabId));
	}

	return tab.pageId;
}
