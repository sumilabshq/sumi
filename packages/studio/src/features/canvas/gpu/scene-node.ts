import type { Path } from "canvaskit-wasm";
import { MeasureMode } from "yoga-layout/load";
import type { Node as YogaNode } from "yoga-layout/load";
import { pxOf } from "./class-style.js";
import type { ClassStyle } from "./class-style.js";
import { styleOfClassName } from "./class-words.js";
import type { GpuContext, HostProps, HostType } from "./gpu-context.js";
import { colourOf } from "./gpu-tokens.js";
import type { Rgba } from "./gpu-tokens.js";
import { NodeColours } from "./node-colours.js";
import type { ColourOwner } from "./node-colours.js";
import { TextBlock, textOfChildren } from "./node-text.js";
import type { MeasuredText, TextLook } from "./node-text.js";
import { applyLayoutStyle } from "./yoga-style.js";

export interface NodeOwner extends ColourOwner {
	markLayoutDirty(): void;
}

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const DEFAULT_FONT_PX = 14;
const DEFAULT_LINE_PX = 20;
const LINE_RATIO = 1.4;

export class SceneNode {
	readonly yoga: YogaNode;
	readonly colours: NodeColours;
	props: HostProps = {};
	style: ClassStyle = styleOfClassName("");
	children: SceneNode[] = [];
	parent: SceneNode | null = null;
	box: Box = { x: 0, y: 0, w: 0, h: 0 };
	text = "";
	hovered = false;
	pressed = false;
	iconPaths: Path[] | null = null;
	private readonly textBlock: TextBlock | null;

	constructor(
		readonly type: HostType,
		props: HostProps,
		readonly owner: NodeOwner,
	) {
		const { yoga, yogaConfig } = owner.context;
		this.yoga = yoga.Node.create(yogaConfig);
		this.colours = new NodeColours(owner);
		this.textBlock = type === "Text" ? new TextBlock(owner.context) : null;
		if (type === "Text") this.yoga.setMeasureFunc((width, mode) => this.measureText(width, mode));
		this.setProps(props, true);
	}

	get context(): GpuContext {
		return this.owner.context;
	}

	setProps(props: HostProps, initial = false): void {
		const previousStyle = this.style;
		this.props = props;
		this.style = styleOfClassName(props.className);
		if (this.style !== previousStyle || initial) applyLayoutStyle(this.yoga, this.style);
		if (this.type === "Icon") this.sizeIcon();
		const text = this.type === "Text" ? textOfChildren(props.children) : "";
		if (text !== this.text || (this.type === "Text" && this.style !== previousStyle)) {
			this.text = text;
			this.yoga.markDirty();
		}
		this.colours.retarget(this.style, this, initial);
		this.owner.markLayoutDirty();
	}

	retint(): void {
		this.colours.retarget(this.style, this, true);
		if (this.type === "Text") this.yoga.markDirty();
		for (const child of this.children) child.retint();
	}

	setInteraction(hovered: boolean, pressed: boolean): void {
		if (hovered === this.hovered && pressed === this.pressed) return;
		this.hovered = hovered;
		this.pressed = pressed;
		this.colours.retarget(this.style, this, false);
	}

	insert(child: SceneNode, index: number): void {
		this.detach(child);
		child.parent = this;
		this.children.splice(index, 0, child);
		this.yoga.insertChild(child.yoga, index);
		this.owner.markLayoutDirty();
	}

	insertBefore(child: SceneNode, before: SceneNode): void {
		this.detach(child);
		this.insert(child, this.children.indexOf(before));
	}

	remove(child: SceneNode): void {
		this.detach(child);
		child.parent = null;
		child.dispose();
		this.owner.markLayoutDirty();
	}

	writeBoxes(parentX: number, parentY: number): void {
		const layout = this.yoga.getComputedLayout();
		this.box = { x: parentX + layout.left, y: parentY + layout.top, w: layout.width, h: layout.height };
		for (const child of this.children) child.writeBoxes(this.box.x, this.box.y);
	}

	collectHits(x: number, y: number, chain: SceneNode[]): boolean {
		if (this.style.display === "none") return false;
		const { box } = this;
		if (x < box.x || y < box.y || x >= box.x + box.w || y >= box.y + box.h) return false;
		chain.push(this);
		for (let at = this.children.length - 1; at >= 0; at -= 1) if (this.children[at]?.collectHits(x, y, chain)) break;
		return true;
	}

	pressTarget(): SceneNode | null {
		for (let node: SceneNode | null = this; node; node = node.parent) if (node.props.onPress) return node;
		return null;
	}

	textColour(): Rgba {
		for (let node: SceneNode | null = this; node; node = node.parent)
			if (node.colours.current.text) return node.colours.current.text;
		return colourOf(this.context.tokens, "ink") ?? [0, 0, 0, 1];
	}

	paragraphAt(width: number): ReturnType<TextBlock["paragraphAt"]> | null {
		return this.textBlock?.paragraphAt(this.textLook(), width) ?? null;
	}

	dispose(): void {
		for (const child of this.children) child.dispose();
		this.colours.dispose();
		this.textBlock?.dispose();
		for (const path of this.iconPaths ?? []) path.delete();
		this.yoga.free();
	}

	private detach(child: SceneNode): void {
		const index = this.children.indexOf(child);
		if (index < 0) return;
		this.children.splice(index, 1);
		this.yoga.removeChild(child.yoga);
	}

	private sizeIcon(): void {
		const size = this.props.size ?? 16;
		if (this.style.width === undefined) this.yoga.setWidth(size);
		if (this.style.height === undefined) this.yoga.setHeight(size);
		this.yoga.setFlexShrink(0);
		for (const path of this.iconPaths ?? []) path.delete();
		this.iconPaths = null;
	}

	private inherited<K extends keyof ClassStyle>(key: K): ClassStyle[K] | undefined {
		for (let node: SceneNode | null = this; node; node = node.parent)
			if (node.style[key] !== undefined) return node.style[key];
		return undefined;
	}

	private textLook(): TextLook {
		const sized = this.inherited("fontSize");
		const fontSize = sized === undefined ? DEFAULT_FONT_PX : pxOf(sized, this.context.tokens.lengths);
		const lineHeight =
			this.inherited("lineHeight") ?? (sized === undefined ? DEFAULT_LINE_PX : Math.round(fontSize * LINE_RATIO));
		return {
			text: this.text,
			fontSize,
			lineHeight,
			weight: this.inherited("weight") ?? 400,
			family: this.inherited("family") ?? "sans",
			tracking: this.inherited("tracking") ?? 0,
			tabular: this.inherited("tabular") ?? false,
			align: this.inherited("align") ?? "left",
			colour: this.textColour(),
			truncate: this.style.truncate,
		};
	}

	private measureText(width: number, mode: MeasureMode): MeasuredText {
		const measured = this.textBlock?.measure(
			this.textLook(),
			width,
			mode === MeasureMode.Exactly,
			mode === MeasureMode.AtMost,
		);
		return measured ?? { width: 0, height: 0 };
	}
}
