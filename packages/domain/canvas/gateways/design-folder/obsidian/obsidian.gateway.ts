import type { DataAdapter } from "obsidian";
import { lookPathOf, readLook } from "@widgetarium/core/app-look.js";
import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { DrawnDesign } from "../../../shared/schema/drawn-design.schema.js";
import { readAppSpec } from "./app-spec.js";
import { docsOf } from "./design-docs.js";
import { drawnDesignOf } from "./drawn-design.js";
import type { DesignVault } from "./drawn-design.js";
import { DesignFolderGateway } from "../design-folder.gateway.js";
import type { DesignFolderRead } from "../../../shared/lib/design/design-shown.js";
import { polledChanges } from "./design-changes.js";
import { textAt, textOrRefused } from "./text-at.js";

export class ObsidianDesignFolderGateway extends DesignFolderGateway {
	private readonly kept = new Map<string, Promise<DesignFolderRead>>();
	private readonly drawn = new Map<string, DrawnDesign | null>();
	private readonly vault: DesignVault;

	constructor(adapter: DataAdapter, registry: WidgetRegistry, drawnRegistry: DesignVault["drawnRegistry"]) {
		super();
		this.vault = {
			adapter,
			registry,
			drawnRegistry,
		};
	}

	override folder(app: string): Promise<DesignFolderRead> {
		const held = this.kept.get(app);

		if (held !== undefined) {
			return held;
		}

		const reading = this.folderRead(app);
		this.kept.set(app, reading);
		reading.catch(() => this.forgetRead(app, reading));
		return reading;
	}

	override spec(app: string): Promise<SpecRead | null> {
		return readAppSpec(this.vault.adapter, app);
	}

	override forgetFolder(app: string): void {
		this.kept.delete(app);
	}

	override designChanged(listener: (app: string) => void): () => void {
		return polledChanges({
			vault: this.vault,
			drawn: () => this.drawn,
			changed: (app) => {
				this.forgetFolder(app);
				listener(app);
			},
		});
	}

	private async folderRead(app: string): Promise<DesignFolderRead> {
		const [design, docs, look] = await Promise.all([
			drawnDesignOf(this.vault, app),
			docsOf(this.vault.adapter, app),
			this.lookOf(app),
		]);

		if (this.kept.has(app)) {
			this.drawn.set(app, design);
		}

		return {
			design,
			docs,
			look,
		};
	}

	private async lookOf(app: string): Promise<DesignFolderRead["look"]> {
		const text = textOrRefused(await textAt(this.vault.adapter, lookPathOf(app)));
		return text === null ? null : readLook(text);
	}

	private forgetRead(app: string, reading: Promise<DesignFolderRead>): void {
		if (this.kept.get(app) === reading) {
			this.kept.delete(app);
		}
	}
}
