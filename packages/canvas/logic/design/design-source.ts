import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look as AppLook } from "@widgetarium/core/app-look.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawnDesign } from "../../schemas/design.schema.js";
import type { Drawing, PictureTaker } from "../../schemas/drawing.schema.js";
import type { Job, LiveJob } from "../../schemas/job.schema.js";
import type { LayerMove } from "../../schemas/layer-move.schema.js";

export interface DesignSource {
	design(app: string, isStarting: boolean): Promise<DrawnDesign>;
	docs(app: string): Promise<readonly CanvasDoc[]>;
	jobs(app: string): readonly Job[];
	onJobs(changed: () => void): () => void;
	liveJob(app: string, id: string): LiveJob | null;
	stopJob(app: string, id: string): Promise<void>;
	drawing(): Drawing;
	onChanged(app: string, changed: () => void): () => void;
	addPhotos(app: string, photos: readonly File[]): Promise<void>;
	moveLayer(widget: string, move: LayerMove): Promise<void>;
	returnToView(app: string, page: string): Promise<void>;
	look(app: string): Promise<Parsed<AppLook> | null>;
	pickLook(app: string, settingName: string, option: string): Promise<void>;
	readonly pictureOf: PictureTaker | null;
}
