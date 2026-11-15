import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { emptyPlacedTabs } from "../../../shared/lib/tabs/kept-tabs.js";
import type { MovePlacedTabs } from "../../../shared/lib/settling/settling.js";
import type { KeptPlaces } from "../../windows/tauri.gateway.js";
import { windowedTabsOf, workspacedTabsOf } from "./kept-session.js";
import type { ReshapedTabs } from "./kept-session.js";
import { TabsGateway } from "../tabs.gateway.js";

export interface TabsStore {
	readonly workspaceId: string;
	readonly kept: Promise<HeldDoc<KeptPlaces>>;
}

export class TauriTabsGateway extends TabsGateway {
	private readonly ready: Promise<HeldDoc<KeptPlaces>>;

	constructor(at: TabsStore) {
		super();
		this.ready = at.kept.then((kept) => readyTabsIn(at, kept));
	}

	override async placedTabs(): Promise<PlacedTabs> {
		return placedIn(await this.ready);
	}

	override async movePlacedTabs<T>(move: MovePlacedTabs<T>): Promise<T> {
		const kept = await this.ready;
		const moved = move(placedIn(kept));

		if (moved.next === null) {
			return moved.answer;
		}

		kept.change({ tabs: moved.next }, `places ${moved.reason}`);
		await kept.flush();
		return moved.answer;
	}

	override placedTabsChanged(listener: () => void): () => void {
		const watching = {
			isStopped: false,
			stop: (): void => undefined,
		};
		void this.ready.then((kept) => {
			if (!watching.isStopped) {
				watching.stop = kept.watch(listener);
			}
		});
		return () => {
			watching.isStopped = true;
			watching.stop();
		};
	}
}

function placedIn(kept: HeldDoc<KeptPlaces>): PlacedTabs {
	return PlacedTabsSchema.parse(kept.now().tabs);
}

async function readyTabsIn({ workspaceId }: TabsStore, kept: HeldDoc<KeptPlaces>): Promise<HeldDoc<KeptPlaces>> {
	const { tabs } = kept.now();

	if (tabs === undefined || tabs === null) {
		kept.change({ tabs: emptyPlacedTabs() }, "places tabs none → empty (no tabs kept yet)");
		await kept.flush();
		return kept;
	}

	const readable = PlacedTabsSchema.safeParse(tabs);

	if (readable.success) {
		return movedBy(await movedBy(kept, windowedTabsOf), workspacedTabsOf(workspaceId));
	}

	const reason = "tabs unreadable → none, the unreadable ones kept aside as unreadableTabs";
	console.error(`[widgetarium] places ${reason}`);
	kept.change({ tabs: emptyPlacedTabs(), unreadableTabs: tabs }, `places ${reason}`);
	await kept.flush();
	return kept;
}

async function movedBy(
	kept: HeldDoc<KeptPlaces>,
	move: (placed: PlacedTabs) => ReshapedTabs | null,
): Promise<HeldDoc<KeptPlaces>> {
	const moved = move(placedIn(kept));

	if (moved === null) {
		return kept;
	}

	kept.change({ tabs: moved.placed }, `places ${moved.reason}`);
	await kept.flush();
	console.info(`[widgetarium] ${moved.reason}`);
	return kept;
}
