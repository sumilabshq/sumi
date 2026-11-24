import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import { emptyPlacedTabs } from "../../../shared/lib/tabs/kept-tabs.js";
import type { MovePlaces, PlacedPlaces } from "../../../shared/lib/flows/flow-moves.js";
import { reconciling } from "../../../shared/lib/flows/flow-reconcile.js";
import type { ReconcileFacts } from "../../../shared/lib/flows/flow-reconcile.js";
import { windowListsFolded } from "./legacy-tabs.js";
import { commitPlaces, placesIn } from "./kept-places.js";
import type { KeptNavigation } from "./kept-places.js";
import { TabsGateway } from "../tabs.gateway.js";

export { workspaceTabsOf } from "./legacy-tabs.js";
export { groupEntriesOf } from "./group-entries.js";
export { oldViewsOf, viewsCarried } from "./carried-panes.js";
export { KeptNavigationSchema } from "./kept-places.js";
export { flowsConverted } from "./flows-conversion.js";
export type { FlowsConversionFacts } from "./flows-conversion.js";
export type { KeptNavigation } from "./kept-places.js";

export interface KeptWorkspaces {
	readonly ownId: string;
	readonly navigationOf: (workspaceId: string) => Promise<HeldDoc<KeptNavigation>>;
	readonly reconcileFacts?: () => ReconcileFacts | null;
}

export class TauriTabsGateway extends TabsGateway {
	private readonly ready: Promise<HeldDoc<KeptNavigation>>;

	constructor(private readonly workspaces: KeptWorkspaces) {
		super();
		this.ready = workspaces.navigationOf(workspaces.ownId).then(readyTabsIn);
	}

	override workspaceId(): string {
		return this.workspaces.ownId;
	}

	override movePlacesIn<T>(workspaceId: string, move: MovePlaces<T>): Promise<T> {
		return new TauriTabsGateway({
			...this.workspaces,
			ownId: workspaceId,
		}).movePlaces(move);
	}

	override async places(): Promise<PlacedPlaces> {
		return placesIn(await this.ready);
	}

	override async movePlaces<T>(move: MovePlaces<T>): Promise<T> {
		return commitPlaces(await this.ready, reconciling(move, this.workspaces.reconcileFacts?.() ?? null));
	}

	override placedTabsChanged(listener: () => void): () => void {
		return this.watched(() => listener);
	}

	override flowsChanged(listener: () => void): () => void {
		return this.watched((kept) => {
			let seen = kept.now().flows;
			return () => {
				const now = kept.now().flows;

				if (now !== seen) {
					seen = now;
					listener();
				}
			};
		});
	}

	private watched(listenerOf: (kept: HeldDoc<KeptNavigation>) => () => void): () => void {
		const watching = {
			isStopped: false,
			stop: (): void => undefined,
		};
		void this.ready.then((kept) => {
			if (!watching.isStopped) {
				watching.stop = kept.watch(listenerOf(kept));
			}
		});
		return () => {
			watching.isStopped = true;
			watching.stop();
		};
	}
}

async function readyTabsIn(kept: HeldDoc<KeptNavigation>): Promise<HeldDoc<KeptNavigation>> {
	const { tabs } = kept.now();

	if (tabs === undefined || tabs === null) {
		kept.change({ tabs: emptyPlacedTabs() }, "navigation tabs none → empty (no tabs kept yet)");
		await kept.flush();
		return kept;
	}

	const readable = PlacedTabsSchema.safeParse(tabs);

	if (!readable.success) {
		const reason = "tabs unreadable → none, the unreadable ones kept aside as unreadableTabs";
		console.error(`[widgetarium] navigation ${reason}`);
		kept.change({ tabs: emptyPlacedTabs(), unreadableTabs: tabs }, `navigation ${reason}`);
		await kept.flush();
		return kept;
	}

	const folded = windowListsFolded(readable.data);

	if (folded === null) {
		return kept;
	}

	kept.change({ tabs: folded.placed }, `navigation ${folded.reason}`);
	await kept.flush();
	console.info(`[widgetarium] navigation ${folded.reason}`);
	return kept;
}
