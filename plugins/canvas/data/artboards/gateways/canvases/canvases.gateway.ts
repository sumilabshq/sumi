import type { Canvas } from "../../shared/schema/canvas.schema.js";

export abstract class CanvasesGateway {
	abstract canvas(canvasId: string): Canvas;
	abstract canvases(): Readonly<Record<string, Canvas>>;
	abstract saveCanvas(canvasId: string, canvas: Canvas, reason: string): void;
	abstract keepView(canvasId: string, canvas: Canvas, reason: string): void;
	abstract canvasesChanged(listener: () => void): () => void;
}
