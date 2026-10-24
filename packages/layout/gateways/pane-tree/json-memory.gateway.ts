import type { JsonMemory } from "@widgetarium/behaviors";
import { PaneTreeSchema } from "../../shared/schema/pane-tree.schema.js";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import { PaneTreeGateway } from "./pane-tree.gateway.js";

const UNREAD = "[widgetarium] kept panes could not be read, so the board starts from the first panes";
const REFUSED = "[widgetarium] kept panes refused, so the board starts from the first panes";

export class JsonMemoryPaneTreeGateway extends PaneTreeGateway {
	constructor(private readonly memory: JsonMemory<PaneTree>) {
		super();
	}

	read(): PaneTree | null {
		try {
			return keptTreeOf(this.memory.read());
		} catch (failure: unknown) {
			console.warn(UNREAD, failure);
			return null;
		}
	}

	keep(tree: PaneTree, reason: string): void {
		this.memory.write(tree, reason);
	}
}

function keptTreeOf(kept: unknown): PaneTree | null {
	if (kept === null) {
		return null;
	}

	const parsed = PaneTreeSchema.safeParse(kept);

	if (parsed.success) {
		return parsed.data;
	}

	console.warn(REFUSED, parsed.error.issues);
	return null;
}
