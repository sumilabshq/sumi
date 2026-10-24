import { worldOf, zoomAround } from "../engine/camera.js";
import type { CanvasView } from "../engine/canvas-view.js";
import type { Crossings, FrameRoot } from "./frame-root.js";
import { pressInside } from "./frame-render.js";
import {
	DOWN_HANDLERS,
	ENTER_HANDLERS,
	LEAVE_HANDLERS,
	PRESS_HANDLERS,
	UP_HANDLERS,
	bubble,
	tellEach,
} from "../nodes/node-events.js";
import type { SceneNode } from "../nodes/scene-node.js";

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
	private pressedLeaf: SceneNode | null = null;
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
		const leaf = hit?.chain.at(-1) ?? null;
		const target = leaf?.pressTarget() ?? null;
		if (hit && target && button === 0) {
			this.pressedFrame = hit.frame;
			this.pressedLeaf = leaf;
			hit.frame.setPressed(target);
			pressInside(() => bubble(leaf, DOWN_HANDLERS, [x, y]));
			return;
		}
		if (!this.view.switches.pans) return;
		this.panningFrom = [x, y];
		this.refreshHover();
	}

	pressableAt(x: number, y: number): boolean {
		const leaf = this.hitAt(x, y)?.chain.at(-1);
		return leaf !== undefined && leaf.pressTarget() !== null;
	}

	up(x: number, y: number): void {
		if (this.panningFrom) {
			this.panningFrom = null;
			return this.refreshHover();
		}
		const frame = this.pressedFrame;
		const target = frame?.pressed;
		const leaf = this.pressedLeaf;
		this.pressedFrame = null;
		this.pressedLeaf = null;
		if (!frame || !target) return;
		frame.setPressed(null);
		const hit = this.hitAt(x, y);
		pressInside(() => {
			bubble(hit?.chain.at(-1) ?? leaf, UP_HANDLERS, [x, y]);
			if (hit?.frame === frame && hit.chain.includes(target)) bubble(target, PRESS_HANDLERS, [x, y]);
		});
	}

	wheel(x: number, y: number, deltaX: number, deltaY: number, zooms: boolean): void {
		this.pointer = [x, y];
		if (!this.view.switches.pans) return;
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

	private tellCrossings({ entered, left }: Crossings, at: Point): void {
		if (entered.length === 0 && left.length === 0) return;
		pressInside(() => {
			tellEach(left, LEAVE_HANDLERS, at);
			tellEach(entered, ENTER_HANDLERS, at);
		});
	}

	private refreshHover(): void {
		const hit = this.pointer && !this.panningFrom ? this.hitAt(...this.pointer) : null;
		const at: Point = this.pointer ?? [0, 0];
		for (const frame of this.view.frames)
			if (frame !== hit?.frame && frame.isHovered()) this.tellCrossings(frame.setPointerChain([]), at);
		if (hit) this.tellCrossings(hit.frame.setPointerChain(hit.chain), at);
		const leaf = hit?.chain.at(-1) ?? null;
		const cursor = this.panningFrom ? "grabbing" : leaf?.pressTarget() ? "pointer" : "default";
		if (cursor === this.cursor) return;
		this.cursor = cursor;
		this.setCursor(cursor);
	}
}
