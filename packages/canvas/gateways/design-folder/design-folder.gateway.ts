import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { CanvasDoc } from "../../shared/schema/doc.schema.js";
import type { DrawnDesign } from "../../shared/schema/design.schema.js";

export abstract class DesignFolderGateway {
	abstract readDesign(app: string, isStarting: boolean): Promise<DrawnDesign>;
	abstract readDocs(app: string): Promise<readonly CanvasDoc[]>;
	abstract readSpec(app: string): Promise<SpecRead | null>;
	abstract watch(app: string, changed: () => void): () => void;
}
