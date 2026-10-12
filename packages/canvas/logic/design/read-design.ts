import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawnDesign } from "../../schemas/design.schema.js";
import { DESIGN_READS, DOCS_READS, LOOK_READS } from "./design-reads.js";
import type { Read } from "./design-reads.js";
import type { DesignSource } from "./design-source.js";

export interface DesignRead {
	readonly design: Read<DrawnDesign>;
	readonly docs: readonly CanvasDoc[];
}

export async function readDesign(source: DesignSource, app: string): Promise<DesignRead> {
	const [docs, look] = await Promise.all([
		DOCS_READS.read(source, app, () => source.docs(app)),
		LOOK_READS.read(source, app, () => source.look(app)),
	]);
	const isStarting = source.jobs(app).length > 0 || docs.value.length > 0 || look.value !== null;
	const design = await DESIGN_READS.read(source, app, () => source.design(app, isStarting));
	return { design, docs: docs.value };
}
