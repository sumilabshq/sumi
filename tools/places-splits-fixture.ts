import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { TabsAsk } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { SidebarEntry } from "../plugins/tabs/navigation/data/navigation/shared/schema/tab-rows.schema.ts";
import type { SplitDir, SplitNode } from "../plugins/tabs/navigation/data/navigation/shared/schema/splits.schema.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { BARE_SCREEN, MAIN_WINDOW, placedTabsOf, placesOver } from "./places-fixture.ts";

export const AT: TabsAsk = { window: MAIN_WINDOW, screen: BARE_SCREEN };
export const SPLIT_ON_BOARD: TabsAsk = {
	window: MAIN_WINDOW,
	screen: {
		...BARE_SCREEN,
		tabPanes: [
			{
				paneId: "pane-split-tab-1",
				tabId: "tab-1",
			},
			{
				paneId: "pane-split-tab-2",
				tabId: "tab-2",
			},
		],
	},
};

export const SEED = {
	tabs: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5"].map((id) => ({
		id,
		app: "canvas" as const,
		pageId: null,
		label: null,
	})),
	lists: {
		workspace: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5"].map((id) => ({ kind: "tab" as const, id })),
	},
	shownId: "tab-1",
	minted: 6,
	closed: [],
};

export function rowOfTwo(id: string, first: string, second: string, dir: SplitDir = "row"): SplitNode {
	return {
		kind: "branch",
		id,
		dir,
		children: [
			{ kind: "tab", tabId: first },
			{ kind: "tab", tabId: second },
		],
		shares: [0.5, 0.5],
	};
}

export function entryShapeOf(entry: SidebarEntry): unknown {
	if (entry.kind === "split") {
		return entry.split.members.map((member) => member.item.tab.id);
	}

	return entry.kind === "tab" ? entry.tab.id : entry.kind;
}

export function started(): { readonly window: Runtime; readonly tabs: MemoryTabsGateway } {
	const tabs = new MemoryTabsGateway(placedTabsOf(SEED, ["chat"]));
	return {
		window: runtime()
			.imports(...placesOver(tabs))
			.start(),
		tabs,
	};
}

export async function sent<T>(answer: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T | string> {
	const settled = await answer;
	return settled.ok ? settled.output : settled.reason;
}

export async function effectKindsOf(answer: Promise<unknown>): Promise<unknown> {
	const settled = await answer;
	return typeof settled === "object" && settled !== null && "effects" in settled && Array.isArray(settled.effects)
		? settled.effects.map((effect: { kind: string }) => effect.kind)
		: settled;
}

export async function splitOf(window: Runtime): Promise<unknown> {
	const shown = await sent(window.send(navigation.splits.shown, { window: MAIN_WINDOW }));
	return typeof shown === "string" || shown.split === null
		? shown
		: { members: shown.split.memberIds, focused: shown.split.focusedId, layout: shown.split.layout };
}

export async function openShapesOf(window: Runtime): Promise<unknown> {
	const sidebar = await sent(window.send(navigation.tabs.sidebar, { at: AT }));
	const sections = typeof sidebar === "string" ? [] : sidebar.sections;
	const open = sections.find((section) => section.list === "workspace")?.entries ?? [];
	return open.map(entryShapeOf).filter((shape) => shape !== "chat");
}
