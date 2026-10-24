import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import { KeptPaneTreeSchema, PaneTreeGateway } from "./pane-tree.gateway.js";

const REFUSED = "[widgetarium] kept panes refused, so the board starts from the first panes";

export const KeptPanesSchema = z.object({
	panes: KeptPaneTreeSchema.nullable()
		.default(null)
		.catch(({ error }) => {
			console.warn(REFUSED, error.issues);
			return null;
		}),
});

export type KeptPanes = z.infer<typeof KeptPanesSchema>;

export class TauriPaneTreeGateway extends PaneTreeGateway {
	constructor(
		private readonly session: HeldDoc<KeptPanes>,
		private readonly first: PaneTree,
	) {
		super();
	}

	tree(): PaneTree {
		return this.session.now().panes ?? this.first;
	}

	saveTree(tree: PaneTree, reason: string): void {
		this.session.change({ panes: tree }, `panes ${reason}`);
		void this.session.flush();
	}

	treeChanged(listener: () => void): () => void {
		return this.session.watch(listener);
	}
}
