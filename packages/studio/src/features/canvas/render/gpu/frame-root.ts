import type { SkPicture } from "canvaskit-wasm";
import { Direction } from "yoga-layout/load";
import type { GpuContext } from "./gpu-context.js";
import { drawNode } from "./node-paint.js";
import { collectHits } from "./node-hits.js";
import { SceneNode } from "./scene-node.js";
import type { NodeOwner } from "./scene-node.js";

export interface Crossings {
	readonly entered: readonly SceneNode[];
	readonly left: readonly SceneNode[];
}

export interface FramePoint {
	readonly x: number;
	readonly y: number;
}

export interface FrameSpec {
	readonly id: string;
	readonly title: string;
	readonly width: number;
	readonly at?: FramePoint | undefined;
	readonly minHeight?: number | undefined;
	readonly onHeight?: ((height: number) => void) | undefined;
}

export class FrameRoot implements NodeOwner {
	readonly root: SceneNode;
	x = 0;
	y = 0;
	height = 0;
	picture: SkPicture | null = null;
	recordCount = 0;
	pressed: SceneNode | null = null;
	private hoverChain: SceneNode[] = [];
	private layoutDirty = true;
	private paintDirty = true;

	constructor(
		readonly spec: FrameSpec,
		readonly context: GpuContext,
	) {
		this.root = new SceneNode("View", { className: "bg-page" }, this);
		this.root.yoga.setMinHeight(spec.minHeight);
		this.x = spec.at?.x ?? 0;
		this.y = spec.at?.y ?? 0;
	}

	get width(): number {
		return this.spec.width;
	}

	markLayoutDirty(): void {
		this.layoutDirty = true;
		this.context.invalidate();
	}

	markPaintDirty(): void {
		this.paintDirty = true;
		this.context.invalidate();
	}

	update(): void {
		if (this.layoutDirty) {
			this.root.yoga.calculateLayout(this.width, undefined, Direction.LTR);
			this.root.writeBoxes(0, 0);
			if (this.height !== this.root.box.h) this.spec.onHeight?.(this.root.box.h);
			this.height = this.root.box.h;
			this.layoutDirty = false;
			this.paintDirty = true;
		}
		if (!this.paintDirty) return;
		const { ck } = this.context;
		const recorder = new ck.PictureRecorder();
		const canvas = recorder.beginRecording(ck.LTRBRect(0, 0, this.width, this.height));
		drawNode(this.root, canvas);
		this.picture?.delete();
		this.picture = recorder.finishRecordingAsPicture();
		recorder.delete();
		this.paintDirty = false;
		this.recordCount += 1;
	}

	retint(): void {
		this.root.retint();
		this.markLayoutDirty();
	}

	hitTest(localX: number, localY: number): SceneNode[] {
		const chain: SceneNode[] = [];
		collectHits(this.root, localX, localY, chain);
		return chain;
	}

	setPointerChain(chain: SceneNode[]): Crossings {
		const next = new Set(chain);
		const was = new Set(this.hoverChain);
		const left = this.hoverChain.filter((node) => !next.has(node));
		for (const node of left) node.setInteraction(false, node === this.pressed);
		for (const node of chain) node.setInteraction(true, node === this.pressed);
		this.hoverChain = chain;
		return { entered: chain.filter((node) => !was.has(node)), left };
	}

	isHovered(): boolean {
		return this.hoverChain.length > 0;
	}

	setPressed(node: SceneNode | null): void {
		const previous = this.pressed;
		this.pressed = node;
		previous?.setInteraction(previous.hovered, false);
		node?.setInteraction(node.hovered, true);
	}

	dispose(): void {
		this.root.dispose();
		this.picture?.delete();
		this.picture = null;
	}
}
