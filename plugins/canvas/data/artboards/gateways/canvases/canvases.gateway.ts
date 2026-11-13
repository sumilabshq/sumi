import type { Canvas } from "../../shared/schema/canvas.schema.js";

export abstract class CanvasesGateway {
	abstract canvas(tabId: string): Canvas;
	abstract canvases(): Readonly<Record<string, Canvas>>;
	abstract saveCanvas(tabId: string, canvas: Canvas, reason: string): void;
	abstract canvasesChanged(listener: () => void): () => void;
}
