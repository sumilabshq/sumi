import type { DataAdapter } from "obsidian";
import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { CanvasDoc } from "../../../shared/schema/doc.schema.js";
import type { DrawnDesign } from "../../../shared/schema/design.schema.js";
import { readAppSpec } from "./app-spec.js";
import { docsOf } from "./design-docs.js";
import { drawnDesignOf } from "./drawn-design.js";
import type { DesignVault } from "./drawn-design.js";
import { DesignFolder } from "../design-folder.adapter.js";
import { polledChanges } from "./design-changes.js";

export class ObsidianDesignFolder extends DesignFolder {
	private readonly drawnOn = new Map<string, DrawnDesign>();
	private readonly vault: DesignVault;

	constructor(adapter: DataAdapter, registry: WidgetRegistry) {
		super();
		this.vault = { adapter, registry };
	}

	override async design(app: string, isStarting: boolean): Promise<DrawnDesign> {
		const design = await drawnDesignOf(this.vault, app, isStarting);
		this.drawnOn.set(app, design);
		return design;
	}

	override docs(app: string): Promise<readonly CanvasDoc[]> {
		return docsOf(this.vault.adapter, app);
	}

	override spec(app: string): Promise<SpecRead | null> {
		return readAppSpec(this.vault.adapter, app);
	}

	override onChanged(app: string, changed: () => void): () => void {
		return polledChanges(this.vault, app, () => this.drawnOn.get(app), changed);
	}

	override noteText(path: string): Promise<string | null> {
		return this.vault.adapter.read(path).catch(() => null);
	}
}
