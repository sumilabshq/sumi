import { placesWindowOf } from "@widgetarium/behaviors";
import { BARE_SCREEN } from "../places-fixture.ts";
import { BUILT_IN_APPS, BUILT_IN_PLACED_APPS } from "../placed-apps-fixture.ts";
import { localTransport, runtime } from "../../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../../packages/shared/data-framework/src/index.ts";
import { StoreClient } from "../../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { StoreHearing } from "../../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { Invoke } from "../../packages/shared/behaviors/src/tauri-store/store-invoke.ts";
import { navigation } from "../../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { TabsAsk } from "../../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as navigationModule } from "../../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { tabGroups } from "../../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { tabGroups as tabGroupsModule } from "../../plugins/tabs/tab-groups/data/tab-groups/generated/module.ts";
import { chatFacts } from "../../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { chatFacts as chatFactsModule } from "../../plugins/ai/chat/data/chat-facts/generated/module.ts";
import { PlacedTabsSchema } from "../../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { PlacedTabs } from "../../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { tabBreaksOf } from "../../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { holdersOf } from "../../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-leases.ts";
import { momentOfWindow } from "../../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import type { FakeStore } from "../host-tauri-fake-store.ts";

export { navigation, tabGroups, chatFacts, BUILT_IN_APPS };

export interface Core {
	readonly link: RemoteTransport;
	readonly store: StoreClient;
	readonly workspace: string;
	window(): Runtime;
}

export function coreOn(invoke: Invoke, workspace: string, hearing?: StoreHearing): Core {
	return coreOver(new StoreClient(invoke, hearing), workspace);
}

export function coreOver(store: StoreClient, workspace: string): Core {
	const config = {
		store,
		apps: BUILT_IN_PLACED_APPS,
	};
	const link = localTransport();
	link.serve(
		runtime()
			.modules(navigationModule(config), tabGroupsModule(config), chatFactsModule(config))
			.start({
				platform: "server",
				env: {},
				scope: { workspaceId: workspace },
			}),
	);
	return {
		link,
		store,
		workspace,
		window: () =>
			runtime()
				.imports(navigation({ over: link }), tabGroups({ over: link }), chatFacts({ over: link }))
				.start(),
	};
}

export function askAt(label: string, workspace: string): TabsAsk {
	return {
		window: placesWindowOf(label, workspace),
		screen: BARE_SCREEN,
	};
}

export function diskTabs(fake: FakeStore, workspace: string): PlacedTabs | null {
	const raw = fake.files.get(`workspace:${workspace}:navigation.json`)?.["tabs"];
	const parsed = PlacedTabsSchema.safeParse(raw);
	return parsed.success ? parsed.data : null;
}

export function breaksOf(placed: PlacedTabs): readonly string[] {
	const tabIds = placed.tabs.map(({ id }) => id);
	const known = new Set(tabIds);
	const duplicated = tabIds.filter((id, at) => tabIds.indexOf(id) !== at).map((id) => `tab id ${id} kept twice`);
	const splitBreaks = placed.splits.flatMap((split) =>
		split.memberIds.filter((id) => !known.has(id)).map((id) => `split ${split.id} names missing tab ${id}`),
	);
	const groupBreaks = placed.groups.flatMap((group) =>
		group.entries
			.filter(({ kind, id }) => kind === "tab" && !known.has(id))
			.map(({ id }) => `group ${group.id} names missing tab ${id}`),
	);
	const joined = new Set(placed.windows.map(({ label }) => label));
	const viewBreaks = Object.entries(placed.views).flatMap(([window, view]) => [
		...(view.shownId !== null && !known.has(view.shownId) ? [`view ${window} shows missing tab ${view.shownId}`] : []),
		...(view.shownSplitId !== null && !placed.splits.some(({ id }) => id === view.shownSplitId)
			? [`view ${window} shows missing split ${view.shownSplitId}`]
			: []),
	]);
	const shownBy = new Map<string, string[]>();

	for (const [window, view] of Object.entries(placed.views)) {
		if (joined.has(window.split("@")[0] ?? window) && view.shownId !== null) {
			shownBy.set(view.shownId, [...(shownBy.get(view.shownId) ?? []), window]);
		}
	}

	const doubleShown = [...shownBy]
		.filter(([, windows]) => windows.length > 1)
		.map(([id, windows]) => `tab ${id} shown by ${windows.join(" and ")}`);
	return [
		...tabBreaksOf(momentOfWindow(placed, null, BUILT_IN_APPS)),
		...duplicated,
		...splitBreaks,
		...groupBreaks,
		...viewBreaks,
		...doubleShown,
	];
}

export function holdersSaid(placed: PlacedTabs): Record<string, string> {
	return Object.fromEntries(holdersOf(placed));
}

export async function silent<T>(run: () => Promise<T>): Promise<{ answer: T; logs: string[] }> {
	const logs: string[] = [];
	const { info, warn, error } = console;
	console.info = (...said: unknown[]) => void logs.push(`info ${said.map(String).join(" ")}`);
	console.warn = (...said: unknown[]) => void logs.push(`warn ${said.map(String).join(" ")}`);
	console.error = (...said: unknown[]) => void logs.push(`error ${said.map(String).join(" ")}`);
	try {
		return { answer: await run(), logs };
	} finally {
		Object.assign(console, { info, warn, error });
	}
}

export function sleep(ms: number): Promise<void> {
	return new Promise((waited) => setTimeout(waited, ms));
}
