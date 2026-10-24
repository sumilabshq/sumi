import type { Path } from "canvaskit-wasm";
import { MeasureMode } from "yoga-layout/load";
import type { Node as YogaNode } from "yoga-layout/load";
import { emptyStyle } from "../style/class-style.js";
import type { ClassStyle } from "../style/class-style.js";
import { styleOfElement } from "../style/element-style.js";
import { isGroupHolder } from "../style/element-words.js";
import type { GpuContext, HostProps, HostType } from "../engine/gpu-context.js";
import { colourOf } from "../style/gpu-tokens.js";
import type { Rgba } from "../style/gpu-tokens.js";
import { PLACEHOLDER_INK, SHAPE_HOLDERS, ownTextOf } from "../style/html-tags.js";
import { NodeColours } from "./node-colours.js";
import type { ColourOwner } from "./node-colours.js";
import { isPressable } from "./node-events.js";
import { layFlow } from "./node-flow.js";
import { dropShapePaths } from "./node-shapes.js";
import { sizeIntrinsic } from "./node-size.js";
import { TextBlock, textOfChildren } from "./node-text.js";
import type { MeasuredText } from "./node-text.js";
import { textLookOf } from "./node-text-look.js";
import { applyLayoutStyle } from "../style/yoga-style.js";

export interface NodeOwner extends ColourOwner {
	markLayoutDirty(): void;
}

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export class SceneNode {
	readonly yoga: YogaNode;
	readonly colours: NodeColours;
	props: HostProps = {};
	style: ClassStyle = emptyStyle();
	children: SceneNode[] = [];
	parent: SceneNode | null = null;
	box: Box = { x: 0, y: 0, w: 0, h: 0 };
	text = "";
	hovered = false;
	pressed = false;
	iconPaths: Path[] | null = null;
	private ownText: SceneNode | null = null;
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

	get holdsShapes(): boolean {
		return SHAPE_HOLDERS.has(this.type);
	}
	setProps(props: HostProps, initial = false): void {
		this.props = props;
		this.restyle(initial);
		if (!initial && isGroupHolder(props)) this.restyleDescendants();
		sizeIntrinsic(this);
		if (this.parent?.holdsShapes) dropShapePaths(this);
		const text = this.type === "Text" ? textOfChildren(props["children"]) : "";
		if (text !== this.text) {
			this.text = text;
			this.yoga.markDirty();
		}
		this.syncOwnText();
		this.owner.markLayoutDirty();
	}

	restyle(initial = false): void {
		const style = styleOfElement(this, this.context.styles);
		if (style === this.style && !initial) return;
		this.style = style;
		applyLayoutStyle(this.yoga, style);
		sizeIntrinsic(this);
		layFlow(this);
		if (this.parent) layFlow(this.parent);
		if (this.type === "Text") this.yoga.markDirty();
		this.colours.retarget(style, this, initial);
	}

	restyleTree(): void {
		this.restyle();
		this.restyleDescendants();
	}

	restyleDescendants(): void {
		for (const child of this.children) child.restyleTree();
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
		if (this.holdsShapes) dropShapePaths(this);
		else this.yoga.insertChild(child.yoga, index);
		child.restyleTree();
		layFlow(this);
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
		layFlow(this);
		this.owner.markLayoutDirty();
	}

	dropOwnText(): void {
		if (!this.ownText) return;
		this.remove(this.ownText);
		this.ownText = null;
	}

	writeBoxes(parentX: number, parentY: number): void {
		const layout = this.yoga.getComputedLayout();
		this.box = { x: parentX + layout.left, y: parentY + layout.top, w: layout.width, h: layout.height };
		if (this.holdsShapes) return;
		for (const child of this.children) child.writeBoxes(this.box.x, this.box.y);
	}

	pressTarget(): SceneNode | null {
		for (let node: SceneNode | null = this; node; node = node.parent) if (isPressable(node.props)) return node;
		return null;
	}

	textColour(): Rgba {
		for (let node: SceneNode | null = this; node; node = node.parent)
			if (node.colours.current.text) return node.colours.current.text;
		return colourOf(this.context.tokens, "ink") ?? [0, 0, 0, 1];
	}

	paragraphAt(width: number): ReturnType<TextBlock["paragraphAt"]> | null {
		return this.textBlock?.paragraphAt(textLookOf(this), width) ?? null;
	}

	dispose(): void {
		for (const child of this.children) child.dispose();
		this.colours.dispose();
		this.textBlock?.dispose();
		for (const path of this.iconPaths ?? []) path.delete();
		this.yoga.free();
	}

	private syncOwnText(): void {
		const own = ownTextOf(this.type, this.props);
		if (!own) return this.dropOwnText();
		const props = { children: own.text, className: own.isPlaceholder ? PLACEHOLDER_INK : undefined };
		if (this.ownText) return this.ownText.setProps(props);
		this.ownText = new SceneNode("Text", props, this.owner);
		this.insert(this.ownText, 0);
	}

	private detach(child: SceneNode): void {
		const index = this.children.indexOf(child);
		if (index < 0) return;
		this.children.splice(index, 1);
		if (!this.holdsShapes) this.yoga.removeChild(child.yoga);
	}

	private measureText(width: number, mode: MeasureMode): MeasuredText {
		const [fixed, bounded] = [mode === MeasureMode.Exactly, mode === MeasureMode.AtMost];
		return this.textBlock?.measure(textLookOf(this), width, fixed, bounded) ?? { width: 0, height: 0 };
	}
}
