import { z } from "zod";
import { KeptEssentialsSchema } from "@widgetarium/app-host";
import type { KeptEssentials } from "@widgetarium/app-host";
import { EssentialsGateway } from "@widgetarium/app-host/gateways";
import { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";

const EssentialsDocSchema = z.looseObject({
	essentials: KeptEssentialsSchema.nullable().catch(null),
});

type EssentialsDoc = z.infer<typeof EssentialsDocSchema>;

const ESSENTIALS: DocKind<EssentialsDoc> = {
	file: "essentials.json",
	v: 1,
	schema: EssentialsDocSchema,
};

export type HeldEssentials = HeldDoc<EssentialsDoc>;

export function readEssentials(store: StoreClient): Promise<HeldEssentials> {
	return HeldDoc.read({
		store,
		root: GLOBAL_ROOT,
		kind: ESSENTIALS,
		empty: EssentialsDocSchema.parse({}),
	});
}

export class TauriEssentialsGateway extends EssentialsGateway {
	constructor(private readonly doc: HeldEssentials) {
		super();
	}

	kept(): KeptEssentials | null {
		return this.doc.now().essentials;
	}

	keep(essentials: KeptEssentials): void {
		this.doc.change({ essentials }, `essentials ${essentials.essentials.length}`);
	}
}
