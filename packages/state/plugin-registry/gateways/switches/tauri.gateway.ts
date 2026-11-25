import { z } from "zod";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { PLUGIN_STATE_FILE } from "@widgetarium/plugin-framework";
import type { Switches } from "../../shared/lib/switch-plan.js";
import { SwitchesGateway } from "./switches.gateway.js";

const KeptStateSchema = z.looseObject({
	plugins: z.record(z.string(), z.looseObject({ enabled: z.boolean().catch(true) })).catch({}),
});

type KeptState = z.infer<typeof KeptStateSchema>;

const PLUGIN_STATE: DocKind<KeptState> = {
	file: PLUGIN_STATE_FILE,
	v: 1,
	schema: KeptStateSchema,
};

const MOST_TRIES = 3;
const NOT_WRITABLE = "the plugin state is of a newer version than this build writes";
const LOST_RACE = "the plugin state kept changing under the write";

export class TauriSwitchesGateway extends SwitchesGateway {
	constructor(private readonly store: StoreClient) {
		super();
	}

	override async switches(): Promise<Switches> {
		const kept = await this.store.readDoc(GLOBAL_ROOT, PLUGIN_STATE);
		return switchesOf(kept.doc);
	}

	override async change(changes: Switches, reason: string): Promise<void> {
		for (let attempt = 0; attempt < MOST_TRIES; attempt += 1) {
			const kept = await this.store.readDoc(GLOBAL_ROOT, PLUGIN_STATE);

			if (kept.isReadOnly) {
				throw new Error(NOT_WRITABLE);
			}

			const plugins = { ...kept.doc?.plugins };

			for (const [id, enabled] of Object.entries(changes)) {
				plugins[id] = { ...plugins[id], enabled };
			}

			const replaced = await this.store.replaceDoc(GLOBAL_ROOT, PLUGIN_STATE, {
				doc: { ...kept.doc, plugins },
				baseRev: kept.rev,
				reason,
			});

			if (replaced.ok) {
				return;
			}
		}

		throw new Error(LOST_RACE);
	}
}

function switchesOf(state: KeptState | null): Switches {
	return Object.fromEntries(Object.entries(state?.plugins ?? {}).map(([id, entry]) => [id, entry.enabled]));
}
