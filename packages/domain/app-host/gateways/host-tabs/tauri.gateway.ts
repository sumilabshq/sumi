import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptTabsSchema } from "../../shared/schema/tabs-session.schema.js";
import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";
import { HostTabsGateway } from "./host-tabs.gateway.js";

export const KeptTabsDocSchema = z.looseObject({
	tabs: KeptTabsSchema.nullable().catch(null),
});

export type KeptTabsDoc = z.infer<typeof KeptTabsDocSchema>;

export class TauriHostTabsGateway extends HostTabsGateway {
	private held: HeldDoc<KeptTabsDoc> | null = null;
	private readonly loaded: Promise<void>;

	constructor(session: Promise<HeldDoc<KeptTabsDoc>>) {
		super();
		this.loaded = session.then((doc) => {
			this.held = doc;
		});
	}

	tabsLoaded(): Promise<void> {
		return this.loaded;
	}

	tabs(): KeptTabs | null {
		return this.held?.now().tabs ?? null;
	}

	saveTabs(tabs: KeptTabs, reason: string): void {
		if (this.held === null) {
			throw new Error(`[widgetarium] tabs saved before session.json was read (${reason})`);
		}

		this.held.change({ tabs: KeptTabsSchema.parse(tabs) }, `tabs ${reason}`);
		void this.held.flush();
	}

	tabsChanged(listener: () => void): () => void {
		const stop = this.loaded.then(() => this.held?.watch(listener));
		return () => void stop.then((stopWatching) => stopWatching?.());
	}

	keepsPagesAcrossStarts(): boolean {
		return false;
	}
}
