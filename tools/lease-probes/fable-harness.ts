import { BARE_SCREEN } from "../places-fixture.ts";
import { BUILT_IN_APPS, builtInPlacedApps } from "../placed-apps-fixture.ts";
import { runtime, localTransport } from "../../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../../packages/shared/data-framework/src/index.ts";
import { navigation } from "../../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as NavigationModule } from "../../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { tabGroups } from "../../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { tabGroups as TabGroupsModule } from "../../plugins/tabs/tab-groups/data/tab-groups/generated/module.ts";
import { chatFacts } from "../../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { chatFacts as ChatFactsModule } from "../../plugins/ai/chat/data/chat-facts/generated/module.ts";
import { MemoryTabsGateway } from "../../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import type { TabsGateway } from "../../plugins/tabs/navigation/data/navigation/gateways/tabs/tabs.gateway.ts";
import { momentOfWindow } from "../../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import { displayedIdsOf } from "../../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-leases.ts";
import type { PlacedTabs } from "../../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { Screen, TabsAsk } from "../../plugins/tabs/navigation/data/navigation/shared/schema/screen.schema.ts";

export { navigation, tabGroups, chatFacts, BARE_SCREEN, BUILT_IN_APPS, MemoryTabsGateway };
export type { Runtime, PlacedTabs };

export interface World {
	readonly tabs: TabsGateway;
	readonly core: RemoteTransport;
	win(): Runtime;
}

export function worldOver(tabs: TabsGateway = new MemoryTabsGateway()): World {
	const core = localTransport();
	const parts = {
		tabs,
		placedApps: builtInPlacedApps(),
	};
	core.serve(
		runtime()
			.modules(
				NavigationModule({ injects: parts }),
				TabGroupsModule({ injects: parts }),
				ChatFactsModule({ injects: parts }),
			)
			.start({ platform: "server", env: {} }),
	);
	return {
		tabs,
		core,
		win: () =>
			runtime()
				.imports(navigation({ over: core }), tabGroups({ over: core }), chatFacts({ over: core }))
				.start(),
	};
}

export function askAt(window: string, screen: Partial<Screen> = {}): TabsAsk {
	return {
		window,
		screen: { ...BARE_SCREEN, ...screen },
	};
}

export function displayedBy(placed: PlacedTabs, window: string): readonly string[] {
	const moment = momentOfWindow(placed, window, BUILT_IN_APPS);
	return [
		...new Set(
			displayedIdsOf(moment, {
				shownId: moment.shownId,
				selectedId: moment.selectedId,
				view: moment.view,
				shownSplitId: moment.shownSplitId,
				sessionId: null,
			}),
		),
	];
}

export function rawDisplayedBy(placed: PlacedTabs, window: string): readonly string[] {
	const view = placed.views[window];
	return view === undefined ? [] : [...new Set(displayedIdsOf(placed, view))];
}

export function doubleDisplaysOf(placed: PlacedTabs, windows: readonly string[]): readonly string[] {
	const seen = new Map<string, string[]>();

	for (const window of windows) {
		for (const id of displayedBy(placed, window)) {
			seen.set(id, [...(seen.get(id) ?? []), window]);
		}
	}

	return [...seen].filter(([, by]) => by.length > 1).map(([id, by]) => `${id} displayed by ${by.join(" and ")}`);
}

export function quietly(): () => void {
	const { info, warn } = console;
	console.info = () => undefined;
	console.warn = () => undefined;
	return () => Object.assign(console, { info, warn });
}

export const tally = { bugs: 0, held: 0 };

export function verdict(what: string, got: unknown, wanted: unknown): boolean {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	tally[ok ? "held" : "bugs"] += 1;
	console.log(
		`${ok ? "HOLDS" : "BUG  "} ${what}${ok ? "" : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(wanted)}`}`,
	);
	return ok;
}

export function finish(name: string): never {
	console.log(`${name}: ${tally.bugs} bug(s) shown, ${tally.held} expectation(s) held`);
	process.exit(0);
}

export function effectsOf(
	answer: { ok: true; output: { effects: readonly { kind: string }[] } } | { ok: false; reason: string },
): unknown {
	return answer.ok ? answer.output.effects : `refused: ${answer.reason}`;
}
