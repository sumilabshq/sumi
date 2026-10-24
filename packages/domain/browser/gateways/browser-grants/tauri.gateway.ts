import { z } from "zod";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, HeldDoc, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { SiteGrantSchema } from "../../shared/schema/site-access.schema.js";
import type { GrantChange, SiteGrant } from "../../shared/schema/site-access.schema.js";
import { BrowserGrantsGateway } from "./browser-grants.gateway.js";

export const KeptGrantsSchema = z.looseObject({
	grants: z.array(SiteGrantSchema).catch([]),
});

export type KeptGrants = z.infer<typeof KeptGrantsSchema>;

export interface TauriGrantFiles {
	readonly grants: string;
	readonly grantChanges: string;
}

export function keptGrantsKind(files: TauriGrantFiles): DocKind<KeptGrants> {
	return {
		file: files.grants,
		v: 1,
		schema: KeptGrantsSchema,
	};
}

export class TauriBrowserGrantsGateway extends BrowserGrantsGateway {
	constructor(
		private readonly kept: HeldDoc<KeptGrants>,
		private readonly store: StoreClient,
		private readonly files: TauriGrantFiles,
	) {
		super();
	}

	grants(): readonly SiteGrant[] {
		return this.kept.now().grants;
	}

	grantsChanged(listener: () => void): () => void {
		return this.kept.watch(listener);
	}

	saveGrants(grants: readonly SiteGrant[], change: GrantChange): void {
		this.kept.change({ grants: [...grants] }, `${change.siteKey} ${change.was ?? "none"} → ${change.became}`);
		const line = {
			...change,
			id: crypto.randomUUID(),
		};
		this.store.appendLine(GLOBAL_ROOT, this.files.grantChanges, line).catch((failure: unknown) => {
			console.error(`[widgetarium] ${this.files.grantChanges} lost a line`, failure);
		});
	}
}
