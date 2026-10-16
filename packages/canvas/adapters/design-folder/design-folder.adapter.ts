import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/design.schema.js";

export abstract class DesignFolder {
	abstract design(app: string, isStarting: boolean): Promise<DrawnDesign>;
	abstract docs(app: string): Promise<readonly CanvasDoc[]>;
	abstract spec(app: string): Promise<SpecRead | null>;
	abstract onChanged(app: string, changed: () => void): () => void;
	abstract noteText(path: string): Promise<string | null>;
}
