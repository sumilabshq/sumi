import type { SkPicture } from "canvaskit-wasm";
import { Direction } from "yoga-layout/load";
import type { GpuContext } from "./gpu-context.js";
import { drawNode } from "./node-paint.js";
import { SceneNode } from "./scene-node.js";
import type { NodeOwner } from "./scene-node.js";

export interface FrameSpec {
	readonly id: string;
	readonly title: string;
	readonly width: number;
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
		this.root.collectHits(localX, localY, chain);
		return chain;
	}

	setPointerChain(chain: SceneNode[]): void {
		const next = new Set(chain);
		for (const node of this.hoverChain) if (!next.has(node)) node.setInteraction(false, node === this.pressed);
		for (const node of chain) node.setInteraction(true, node === this.pressed);
		this.hoverChain = chain;
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
