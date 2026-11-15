import { createEmptyCanvas } from "../../shared/lib/canvas-edits.js";
import type { Canvas } from "../../shared/schema/canvas.schema.js";
import { CanvasesGateway } from "./canvases.gateway.js";

export class MemoryCanvasesGateway extends CanvasesGateway {
	private held: Readonly<Record<string, Canvas>> = {};
	private readonly listeners = new Set<() => void>();

	override canvas(canvasId: string): Canvas {
		return this.held[canvasId] ?? createEmptyCanvas();
	}

	override canvases(): Readonly<Record<string, Canvas>> {
		return this.held;
	}

	override saveCanvas(canvasId: string, canvas: Canvas): void {
		this.held = {
			...this.held,
			[canvasId]: canvas,
		};

		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	override canvasesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
