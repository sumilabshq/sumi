import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptEssentialsSchema } from "../../shared/schema/essential.schema.js";
import type { KeptEssentials } from "../../shared/schema/essential.schema.js";
import { EssentialsGateway } from "./essentials.gateway.js";

export const EssentialsDocSchema = z.looseObject({
	essentials: KeptEssentialsSchema.nullable().catch(null),
});

export type EssentialsDoc = z.infer<typeof EssentialsDocSchema>;

export class TauriEssentialsGateway extends EssentialsGateway {
	private held: HeldDoc<EssentialsDoc> | null = null;
	private readonly loaded: Promise<void>;

	constructor(doc: Promise<HeldDoc<EssentialsDoc>>) {
		super();
		this.loaded = doc.then((read) => {
			this.held = read;
		});
	}

	essentialsLoaded(): Promise<void> {
		return this.loaded;
	}

	essentials(): KeptEssentials | null {
		return this.held?.now().essentials ?? null;
	}

	saveEssentials(essentials: KeptEssentials, reason: string): void {
		if (this.held === null) {
			throw new Error(`[widgetarium] essentials saved before essentials.json was read (${reason})`);
		}

		this.held.change({ essentials }, `essentials ${reason}`);
		void this.held.flush();
	}

	essentialsChanged(listener: () => void): () => void {
		const stop = this.loaded.then(() => this.held?.watch(listener));
		return () => void stop.then((stopWatching) => stopWatching?.());
	}
}
