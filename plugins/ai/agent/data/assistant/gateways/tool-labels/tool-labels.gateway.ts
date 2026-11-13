import type { ToolLabel } from "../../shared/schema/tool-label.schema.js";

export interface ServedToolName {
	readonly server: string;
	readonly tool: string;
}

export abstract class ToolLabelsGateway {
	abstract labelOf(named: ServedToolName): ToolLabel | null;
}
