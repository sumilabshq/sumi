import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { emptyPlacedTabs } from "../../../shared/lib/tabs/kept-tabs.js";
import type { MovePlacedTabs } from "../../../shared/lib/settling/settling.js";
import { windowListsFolded } from "./legacy-tabs.js";

export { workspaceTabsOf } from "./legacy-tabs.js";
export { groupEntriesOf } from "./group-entries.js";
export { oldViewsOf, viewsCarried } from "./carried-panes.js";
import { TabsGateway } from "../tabs.gateway.js";

export const KeptNavigationSchema = z.looseObject({
	tabs: z.unknown().optional(),
	unreadableTabs: z.unknown().optional(),
	panesCarried: z.boolean().optional(),
});

export type KeptNavigation = z.infer<typeof KeptNavigationSchema>;

export class TauriTabsGateway extends TabsGateway {
	private readonly ready: Promise<HeldDoc<KeptNavigation>>;

	constructor(kept: Promise<HeldDoc<KeptNavigation>>) {
		super();
		this.ready = kept.then(readyTabsIn);
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

		kept.change({ tabs: moved.next }, `navigation ${moved.reason}`);
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

function placedIn(kept: HeldDoc<KeptNavigation>): PlacedTabs {
	return PlacedTabsSchema.parse(kept.now().tabs);
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
