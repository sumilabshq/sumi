import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";

export abstract class TabsColumnGateway {
	abstract column(): KeptColumn;
	abstract saveColumn(column: KeptColumn, reason: string): void;
	abstract columnChanged(listener: () => void): () => void;
}
