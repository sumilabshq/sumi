import { worldOf, zoomAround } from "./camera.js";
import type { CanvasView } from "./canvas-view.js";
import type { FrameRoot } from "./frame-root.js";
import { pressInside } from "./frame-render.js";
import type { SceneNode } from "./scene-node.js";

export interface PointerSink {
	move(x: number, y: number): void;
	down(x: number, y: number, button: number): void;
	up(x: number, y: number): void;
	leave(): void;
	wheel(x: number, y: number, deltaX: number, deltaY: number, zooms: boolean): void;
}

interface Hit {
	readonly frame: FrameRoot;
	readonly chain: SceneNode[];
}

type Point = readonly [number, number];

const WHEEL_ZOOM_RATE = 0.01;

export class ViewPointer implements PointerSink {
	private panningFrom: Point | null = null;
	private pressedFrame: FrameRoot | null = null;
	private pointer: Point | null = null;
	private cursor = "default";

	constructor(
		private readonly view: CanvasView,
		private readonly setCursor: (cursor: string) => void,
	) {}

	move(x: number, y: number): void {
		this.pointer = [x, y];
		if (!this.panningFrom) return this.refreshHover();
		const [fromX, fromY] = this.panningFrom;
		this.view.camera.x += x - fromX;
		this.view.camera.y += y - fromY;
		this.panningFrom = [x, y];
		this.view.requestFrame();
	}

	leave(): void {
		this.pointer = null;
		this.refreshHover();
	}

	down(x: number, y: number, button: number): void {
		const hit = this.hitAt(x, y);
		const target = hit?.chain.at(-1)?.pressTarget() ?? null;
		if (hit && target && button === 0) {
			this.pressedFrame = hit.frame;
			hit.frame.setPressed(target);
			return;
		}
		this.panningFrom = [x, y];
		this.refreshHover();
	}

	up(x: number, y: number): void {
		if (this.panningFrom) {
			this.panningFrom = null;
			return this.refreshHover();
		}
		const frame = this.pressedFrame;
		const target = frame?.pressed;
		this.pressedFrame = null;
		if (!frame || !target) return;
		frame.setPressed(null);
		const hit = this.hitAt(x, y);
		const press = target.props.onPress;
		if (press && hit?.frame === frame && hit.chain.includes(target)) pressInside(press);
	}

	wheel(x: number, y: number, deltaX: number, deltaY: number, zooms: boolean): void {
		this.pointer = [x, y];
		if (zooms) zoomAround(this.view.camera, x, y, Math.exp(-deltaY * WHEEL_ZOOM_RATE));
		else {
			this.view.camera.x -= deltaX;
			this.view.camera.y -= deltaY;
		}
		this.refreshHover();
		this.view.requestFrame();
	}

	private hitAt(screenX: number, screenY: number): Hit | null {
		const [worldX, worldY] = worldOf(this.view.camera, screenX, screenY);
		const frame = this.view.frames.find(
			(one) => worldX >= one.x && worldY >= one.y && worldX < one.x + one.width && worldY < one.y + one.height,
		);
		if (!frame) return null;
		return { frame, chain: frame.hitTest(worldX - frame.x, worldY - frame.y) };
	}

	private refreshHover(): void {
		const hit = this.pointer && !this.panningFrom ? this.hitAt(...this.pointer) : null;
		for (const frame of this.view.frames) if (frame !== hit?.frame && frame.isHovered()) frame.setPointerChain([]);
		if (hit) hit.frame.setPointerChain(hit.chain);
		const leaf = hit?.chain.at(-1) ?? null;
		const cursor = this.panningFrom ? "grabbing" : leaf?.pressTarget() ? "pointer" : "default";
		if (cursor === this.cursor) return;
		this.cursor = cursor;
		this.setCursor(cursor);
	}
}
