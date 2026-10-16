import type { App } from "obsidian";
import type { Board } from "@widgetarium/core/model.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { CanvasDoc } from "../../../schema/doc.schema.js";
import type { DrawnDesign } from "../../../schema/design.schema.js";
import type { Drawing, PictureTaker } from "../../../schema/drawing.schema.js";
import type { Job, LiveJob } from "../../../schema/job.schema.js";
import type { LayerMove } from "../../../schema/layer-move.schema.js";
import { DesignSource } from "../design-source.adapter.js";
import { polledChanges, watchedJobs } from "./design-changes.js";
import type { AppJobs } from "./design-changes.js";
import { withBlocks } from "../../../lib/design/design-block-registry.js";
import { docsOf } from "../../../lib/design/design-docs.js";
import { layerMoved, photosAdded, pickLookOption, readAppLook, returnedToAppNote } from "./design-writes.js";
import type { DesignPlace } from "./design-writes.js";
import { boardIn, boardOrRefused } from "../../../lib/design/board-in-note.js";
import { pictureTakerOf } from "./off-screen.js";
import type { FetchUrl } from "./off-screen.js";
import { drawnDesignOf } from "../../../lib/design/drawn-design.js";
import type { DesignVault } from "../../../lib/design/drawn-design.js";

export { drawnOffScreen, pictureTakerOf, pngOf, stackedPngOf } from "./off-screen.js";

const NO_NOTE = "{note} is not a note in this vault";

export interface ObsidianDesignHeld {
	readonly registry: WidgetRegistry;
	readonly host: Drawing["host"];
	readonly jobs: AppJobs;
	readonly place: DesignPlace;
	readonly fetchUrl: FetchUrl;
}

export class ObsidianDesignSource extends DesignSource {
	override readonly pictureOf: PictureTaker;
	private readonly drawnOn = new Map<string, DrawnDesign>();
	private readonly vault: DesignVault;

	constructor(
		private readonly obsidian: App,
		private readonly held: ObsidianDesignHeld,
	) {
		super();
		this.vault = { adapter: obsidian.vault.adapter, registry: held.registry };
		this.pictureOf = pictureTakerOf(held.fetchUrl);
	}

	override async design(app: string, isStarting: boolean): Promise<DrawnDesign> {
		const design = await drawnDesignOf(this.vault, app, isStarting);
		this.drawnOn.set(app, design);
		return design;
	}

	override docs(app: string): Promise<readonly CanvasDoc[]> {
		return docsOf(this.vault.adapter, app);
	}

	override jobs(app: string): readonly Job[] {
		return this.held.jobs.jobsOf(app);
	}

	override onJobs(changed: () => void): () => void {
		return watchedJobs(this.held.jobs, changed);
	}

	override liveJob(app: string, id: string): LiveJob | null {
		return this.held.jobs.liveOf(app, id);
	}

	override async stopJob(app: string, id: string): Promise<void> {
		await this.held.jobs.stop(app, id);
	}

	override drawing(): Drawing {
		return { registry: withBlocks(this.held.registry), host: this.held.host };
	}

	override onChanged(app: string, changed: () => void): () => void {
		return polledChanges(this.vault, app, () => this.drawnOn.get(app), changed);
	}

	override addPhotos(app: string, photos: readonly File[]): Promise<void> {
		return photosAdded(this.obsidian, app, photos);
	}

	override moveLayer(widget: string, move: LayerMove): Promise<void> {
		return layerMoved(this.obsidian, this.held.registry, widget, move);
	}

	override returnToView(app: string, page: string): Promise<void> {
		return returnedToAppNote(this.obsidian, this.held.place, app, page);
	}

	override look(app: string): Promise<Parsed<Look> | null> {
		return readAppLook(this.obsidian, app);
	}

	override pickLook(app: string, settingName: string, option: string): Promise<void> {
		return pickLookOption(this.obsidian, app, settingName, option);
	}

	override async noteBoard(path: string): Promise<Board | null> {
		const text = await this.vault.adapter.read(path).catch(() => null);
		if (text === null) throw new Error(NO_NOTE.replace("{note}", path));
		return boardOrRefused(boardIn(text), path);
	}
}
