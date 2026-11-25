import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import type { AnyRequest, InputArgs, OutputOf } from "../packages/shared/data-framework/src/request.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { flowsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-conversion.ts";
import { flowBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-laws.ts";
import type { FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import type { PlacedTabs, TabMark } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { ListedPlacedAppsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/placed-apps/listed.gateway.ts";
import { placedAppsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/app-abilities.ts";
import type { PlacedApp } from "../plugins/tabs/navigation/data/navigation/shared/host/places.host.ts";
import { BUILT_IN_APPS, BUILT_IN_PLACED_APPS } from "./placed-apps-fixture.ts";
import { placesOver } from "./places-fixture.ts";
import { MAIN_WINDOW, chatIdOf, fixturePlaced } from "./flows-fixture.ts";

const NOW = 1_700_000_000_000;
export const MAIN = MAIN_WINDOW;
export const SIDE = "studio-2@fixture";

const MARKED: Readonly<Record<string, TabMark>> = {
	[chatIdOf(5)]: "failed",
	[chatIdOf(6)]: "asking",
};

function seeded(): { readonly placed: PlacedTabs; readonly flows: FlowsDoc } {
	const base = fixturePlaced();
	const placed: PlacedTabs = {
		...base,
		tabs: base.tabs.map((tab) => ({ ...tab, mark: MARKED[tab.id] ?? tab.mark })),
		windows: [
			{ label: "main", openedAt: 1 },
			{ label: "studio-2", openedAt: 2 },
		],
	};
	const converted = flowsOf({ placed, apps: BUILT_IN_APPS, sourceRev: 1, now: NOW });

	if (converted.isRefused) {
		throw new Error(converted.reasons.join("; "));
	}

	return { placed, flows: converted.doc };
}

export interface Asker {
	send<R extends AnyRequest>(request: R, ...asked: InputArgs<R>): Promise<OutputOf<R>>;
}

export interface Stand {
	readonly tabs: MemoryTabsGateway;
	readonly app: Asker;
}

function askerOf(started: Runtime): Asker {
	return {
		async send(request, ...asked) {
			const answer = await started.send(request, ...asked);

			if (!answer.ok) {
				throw new Error(answer.reason);
			}

			return answer.output;
		},
	};
}

export function standOver(
	withFlows: boolean,
	extraApps: readonly PlacedApp[] = [],
	broken: (flows: FlowsDoc) => FlowsDoc = (flows) => flows,
): Stand {
	const { placed, flows } = seeded();
	const listed = [...BUILT_IN_PLACED_APPS, ...extraApps];
	const tabs = new MemoryTabsGateway(placed, undefined, undefined, withFlows ? broken(flows) : null, {
		apps: placedAppsOf(listed),
		now: () => NOW,
	});
	return {
		tabs,
		app: askerOf(
			runtime()
				.imports(...placesOver(tabs, new ListedPlacedAppsGateway(listed)))
				.start(),
		),
	};
}

export async function lawsOf(stand: Stand): Promise<readonly string[]> {
	const { tabs, flows } = await stand.tabs.places();
	return flows === null
		? ["no flows"]
		: flowBreaksOf(
				flows,
				tabs.tabs.map(({ id }) => id),
			);
}

export async function flowsIn(stand: Stand): Promise<FlowsDoc> {
	const { flows } = await stand.tabs.places();

	if (flows === null) {
		throw new Error("no flows");
	}

	return flows;
}

export async function refusalOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "";
	} catch (failure: unknown) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

export function chatFlow(id: number): string {
	return `flow-chat-${chatIdOf(id)}`;
}
