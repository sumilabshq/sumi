import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";

export abstract class TabsColumnGateway {
	abstract kept(): KeptColumn | null;
	abstract keep(column: KeptColumn): void;
}
