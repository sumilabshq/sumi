import type { DocKind, HeldDoc, StoreClient, StoreRoot } from "@widgetarium/behaviors/tauri-store";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { emptyPlacedTabs } from "../../../shared/lib/tabs/kept-tabs.js";
import { tabBreaksOf } from "../../../shared/lib/tabs/tab-invariants.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { MovePlacedTabs } from "../../../shared/lib/settling/settling.js";
import type { KeptPlaces } from "../../windows/tauri.gateway.js";
import {
	KeptChatsReadSchema,
	KeptSessionDocSchema,
	chatEntriesOf,
	migratedTabsOf,
	migrationSaid,
} from "./kept-session.js";
import type { KeptChatsRead, KeptSessionDoc } from "./kept-session.js";
import { TabsGateway } from "../tabs.gateway.js";

export interface TabsStore {
	readonly store: StoreClient;
	readonly root: StoreRoot;
	readonly kept: Promise<HeldDoc<KeptPlaces>>;
	readonly apps: PlacedApps;
}

const OLD_SESSION: DocKind<KeptSessionDoc> = {
	file: "session.json",
	v: 1,
	schema: KeptSessionDocSchema,
};

const OLD_CHATS: DocKind<KeptChatsRead> = {
	file: "chats.json",
	v: 1,
	schema: KeptChatsReadSchema,
};

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

async function readyTabsIn(at: TabsStore, kept: HeldDoc<KeptPlaces>): Promise<HeldDoc<KeptPlaces>> {
	const { tabs } = kept.now();

	if (tabs === undefined || tabs === null) {
		return migrated(at, kept);
	}

	if (PlacedTabsSchema.safeParse(tabs).success) {
		return kept;
	}

	const reason = "tabs unreadable → none, the unreadable ones kept aside as unreadableTabs";
	console.error(`[widgetarium] places ${reason}`);
	kept.change({ tabs: emptyPlacedTabs(), unreadableTabs: tabs }, `places ${reason}`);
	await kept.flush();
	return kept;
}

async function migrated({ store, root, apps }: TabsStore, kept: HeldDoc<KeptPlaces>): Promise<HeldDoc<KeptPlaces>> {
	const [session, chats] = await Promise.all([store.readDoc(root, OLD_SESSION), store.readDoc(root, OLD_CHATS)]);
	const sessionTabs = session.doc?.tabs ?? null;
	const chatEntries = chatEntriesOf(chats.doc ?? KeptChatsReadSchema.parse({}));
	const placed = migratedTabsOf(sessionTabs, chatEntries);
	const breaks = tabBreaksOf({ ...placed, apps });
	const reason = migrationSaid(sessionTabs, chatEntries);
	kept.change({ tabs: placed }, `places ${reason}`);
	await kept.flush();
	console.info(`[widgetarium] ${reason}`);

	if (breaks.length > 0) {
		console.warn(`[widgetarium] migrated tabs break ${breaks.length} laws: ${breaks.join("; ")}`);
	}
	return kept;
}
