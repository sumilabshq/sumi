import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look as AppLook } from "@widgetarium/core/app-look.js";
import type { Board } from "@widgetarium/core/model.js";
import type { CanvasDoc } from "../schema/doc.js";
import type { DrawnDesign } from "../schema/design.js";
import type { Drawing, PictureTaker } from "../schema/drawing.js";
import type { Job, LiveJob } from "../schema/job.js";
import type { LayerMove } from "../schema/layer-move.js";

export abstract class DesignSource {
	abstract design(app: string, isStarting: boolean): Promise<DrawnDesign>;
	abstract docs(app: string): Promise<readonly CanvasDoc[]>;
	abstract jobs(app: string): readonly Job[];
	abstract onJobs(changed: () => void): () => void;
	abstract liveJob(app: string, id: string): LiveJob | null;
	abstract stopJob(app: string, id: string): Promise<void>;
	abstract drawing(): Drawing;
	abstract onChanged(app: string, changed: () => void): () => void;
	abstract addPhotos(app: string, photos: readonly File[]): Promise<void>;
	abstract moveLayer(widget: string, move: LayerMove): Promise<void>;
	abstract returnToView(app: string, page: string): Promise<void>;
	abstract look(app: string): Promise<Parsed<AppLook> | null>;
	abstract pickLook(app: string, settingName: string, option: string): Promise<void>;
	abstract noteBoard(path: string): Promise<Board | null>;
	abstract readonly pictureOf: PictureTaker | null;
}
