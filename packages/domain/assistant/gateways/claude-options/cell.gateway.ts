import type { ClaudeOptionsCell } from "../../shared/host/claude-options.host.js";
import type { ClaudeOptions } from "../../shared/schema/claude-options.schema.js";
import { ClaudeOptionsGateway } from "./claude-options.gateway.js";

export class CellClaudeOptionsGateway extends ClaudeOptionsGateway {
	constructor(private readonly cell: ClaudeOptionsCell) {
		super();
	}

	claudeOptions(): ClaudeOptions {
		return this.cell.value();
	}

	saveClaudeOptions(next: ClaudeOptions): void {
		this.cell.save(next);
	}

	claudeOptionsChanged(listener: () => void): () => void {
		return this.cell.changed(listener);
	}
}
