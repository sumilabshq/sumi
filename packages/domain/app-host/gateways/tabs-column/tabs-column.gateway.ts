import { z } from "zod";
import { KeptColumnSchema } from "../../shared/schema/tabs-column.schema.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";

export abstract class TabsColumnGateway {
	abstract column(): KeptColumn;
	abstract saveColumn(column: KeptColumn, reason: string): void;
	abstract columnChanged(listener: () => void): () => void;
}

export const StoredColumnSchema = KeptColumnSchema.extend({
	hidesEmptyLists: z.boolean().default(false).catch(offWhenUnreadable("hidesEmptyLists")),
	hidesOwnWindowTabs: z.boolean().default(false).catch(offWhenUnreadable("hidesOwnWindowTabs")),
});

function offWhenUnreadable(option: string): (failed: { readonly input: unknown }) => false {
	return ({ input }) => {
		console.warn(
			`[widgetarium] tabs column option ${option} ${JSON.stringify(input)} → false (the kept value is not a boolean)`,
		);
		return false;
	};
}
