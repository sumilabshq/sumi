import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptColumnSchema } from "../../shared/schema/tabs-column.schema.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { TabsColumnGateway } from "./tabs-column.gateway.js";

export const KeptColumnDocSchema = z.looseObject({
	column: KeptColumnSchema.nullable().catch(null),
});

export type KeptColumnDoc = z.infer<typeof KeptColumnDocSchema>;

export class TauriTabsColumnGateway extends TabsColumnGateway {
	constructor(
		private readonly session: HeldDoc<KeptColumnDoc>,
		private readonly first: KeptColumn,
	) {
		super();
	}

	column(): KeptColumn {
		return this.session.now().column ?? this.first;
	}

	saveColumn(column: KeptColumn, reason: string): void {
		this.session.change({ column: KeptColumnSchema.parse(column) }, `column ${reason}`);
		void this.session.flush();
	}

	columnChanged(listener: () => void): () => void {
		return this.session.watch(listener);
	}
}
