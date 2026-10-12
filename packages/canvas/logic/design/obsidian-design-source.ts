import type { App } from "obsidian";
import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawnDesign } from "../../schemas/design.schema.js";
import type { Drawing, PictureTaker } from "../../schemas/drawing.schema.js";
import type { Job, LiveJob } from "../../schemas/job.schema.js";
import type { LayerMove } from "../../schemas/layer-move.schema.js";
import type { DesignSource } from "./design-source.js";
import { polledChanges, watchedJobs } from "./obsidian/design-changes.js";
import type { AppJobs } from "./obsidian/design-changes.js";
import { withBlocks } from "./obsidian/design-block-registry.js";
import { docsOf } from "./obsidian/design-docs-read.js";
import { layerMoved, photosAdded, pickLookOption, readAppLook, returnedToAppNote } from "./obsidian/design-writes.js";
import type { DesignPlace } from "./obsidian/design-writes.js";
import { canvasOf } from "./obsidian/off-screen.js";
import { drawnDesignOf } from "./obsidian/vault-design.js";
import type { DesignVault } from "./obsidian/vault-design.js";

export type { AppJobs } from "./obsidian/design-changes.js";
export type { DesignPlace } from "./obsidian/design-writes.js";
export type { DesignVault } from "./obsidian/vault-design.js";
export { drawnDesignOf } from "./obsidian/vault-design.js";
export { withBlocks } from "./obsidian/design-block-registry.js";
export { boardIn } from "./obsidian/board-in-note.js";
export { canvasOf, drawnOffScreen, pngOf, stackedPngOf } from "./obsidian/off-screen.js";

export interface ObsidianDesignHeld {
	readonly obsidian: App;
	readonly registry: WidgetRegistry;
	readonly host: Drawing["host"];
	readonly jobs: AppJobs | undefined;
	readonly place: DesignPlace;
}

export class ObsidianDesignSource implements DesignSource {
	readonly pictureOf: PictureTaker = canvasOf;
	private readonly drawnOn = new Map<string, DrawnDesign>();
	private readonly vault: DesignVault;

	constructor(private readonly held: ObsidianDesignHeld) {
		this.vault = { adapter: held.obsidian.vault.adapter, registry: held.registry };
	}

	async design(app: string, isStarting: boolean): Promise<DrawnDesign> {
		const design = await drawnDesignOf(this.vault, app, isStarting);
		this.drawnOn.set(app, design);
		return design;
	}

	docs(app: string): Promise<readonly CanvasDoc[]> {
		return docsOf(this.vault.adapter, app);
	}

	jobs(app: string): readonly Job[] {
		return this.held.jobs?.jobsOf(app) ?? [];
	}

	onJobs(changed: () => void): () => void {
		return watchedJobs(this.held.jobs, changed);
	}

	liveJob(app: string, id: string): LiveJob | null {
		return this.held.jobs?.liveOf(app, id) ?? null;
	}

	async stopJob(app: string, id: string): Promise<void> {
		await this.held.jobs?.stop(app, id);
	}

	drawing(): Drawing {
		return { registry: withBlocks(this.held.registry), host: this.held.host };
	}

	onChanged(app: string, changed: () => void): () => void {
		return polledChanges(this.vault, app, () => this.drawnOn.get(app), changed);
	}

	addPhotos(app: string, photos: readonly File[]): Promise<void> {
		return photosAdded(this.held.obsidian, app, photos);
	}

	moveLayer(widget: string, move: LayerMove): Promise<void> {
		return layerMoved(this.held.obsidian, this.held.registry, widget, move);
	}

	returnToView(app: string, page: string): Promise<void> {
		return returnedToAppNote(this.held.obsidian, this.held.place, app, page);
	}

	look(app: string): Promise<Parsed<Look> | null> {
		return readAppLook(this.held.obsidian, app);
	}

	pickLook(app: string, settingName: string, option: string): Promise<void> {
		return pickLookOption(this.held.obsidian, app, settingName, option);
	}
}
