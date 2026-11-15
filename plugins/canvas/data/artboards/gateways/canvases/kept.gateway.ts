import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { createEmptyCanvas } from "../../shared/lib/canvas-edits.js";
import { CanvasSchema } from "../../shared/schema/canvas.schema.js";
import type { Canvas } from "../../shared/schema/canvas.schema.js";
import { CanvasesGateway } from "./canvases.gateway.js";

export const KeptCanvasesSchema = z.looseObject({
	canvases: z.record(z.string(), z.unknown()).catch({}),
});

export type KeptCanvases = z.infer<typeof KeptCanvasesSchema>;

export const KEPT_CANVASES: DocKind<KeptCanvases> = {
	file: "canvases.json",
	v: 1,
	schema: KeptCanvasesSchema,
};

const UNREADABLE =
	"[artboards] canvas {tab} in canvases.json does not match its shape, so it is shown empty and kept as it is";

export class KeptCanvasesGateway extends CanvasesGateway {
	constructor(private readonly kept: HeldDoc<KeptCanvases>) {
		super();
	}

	override canvas(canvasId: string): Canvas {
		const kept = this.kept.now().canvases[canvasId];
		return kept === undefined ? createEmptyCanvas() : (readCanvas(canvasId, kept) ?? createEmptyCanvas());
	}

	override canvases(): Readonly<Record<string, Canvas>> {
		const read = Object.entries(this.kept.now().canvases).flatMap(([canvasId, kept]) => {
			const canvas = readCanvas(canvasId, kept);
			return canvas === null ? [] : [[canvasId, canvas] as const];
		});
		return Object.fromEntries(read);
	}

	override saveCanvas(canvasId: string, canvas: Canvas, reason: string): void {
		const canvases = {
			...this.kept.now().canvases,
			[canvasId]: canvas,
		};
		this.kept.change({ canvases }, `artboards ${canvasId}: ${reason}`);
	}

	override canvasesChanged(listener: () => void): () => void {
		return this.kept.watch(listener);
	}
}

function readCanvas(canvasId: string, kept: unknown): Canvas | null {
	const read = CanvasSchema.safeParse(kept);

	if (!read.success) {
		console.warn(UNREADABLE.replace("{tab}", canvasId), read.error.issues);
		return null;
	}

	return read.data;
}
