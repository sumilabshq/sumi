import { Align, FlexDirection, Wrap } from "yoga-layout/load";
import { SHAPE_HOLDERS } from "../style/html-tags.js";
import { ALIGN_OF } from "../style/yoga-style.js";
import type { ClassStyle } from "../style/class-style.js";
import type { Node as YogaNode } from "yoga-layout/load";

export interface FlowNode {
	readonly type: string;
	readonly style: ClassStyle;
	readonly yoga: YogaNode;
	readonly children: readonly FlowNode[];
}

export function layFlow(node: FlowNode): void {
	if (SHAPE_HOLDERS.has(node.type) || !isHtmlTag(node.type)) return;
	const flows = isFlowing(node);
	if (!node.style.displaySet && node.style.display !== "none") {
		node.yoga.setFlexDirection(flows ? FlexDirection.Row : FlexDirection.Column);
		node.yoga.setFlexWrap(flows || node.style.wrap ? Wrap.Wrap : Wrap.NoWrap);
		node.yoga.setAlignItems(flows ? Align.Baseline : node.style.items ? ALIGN_OF[node.style.items] : Align.Stretch);
	}
	for (const child of node.children) child.yoga.setAlignSelf(selfOf(node, child, flows));
}

export function isInlineLevel(node: FlowNode): boolean {
	return node.type === "Text" || node.style.inline;
}

export function isHtmlTag(type: string): boolean {
	return type === type.toLowerCase();
}

function isFlowing(node: FlowNode): boolean {
	return !node.style.displaySet && node.children.length > 1 && node.children.every(isInlineLevel);
}

function selfOf(parent: FlowNode, child: FlowNode, flows: boolean): Align {
	if (child.style.self) return ALIGN_OF[child.style.self];
	const isBlockParent = !flows && !parent.style.displaySet;
	if (isBlockParent && child.type !== "Text" && isInlineLevel(child)) return Align.FlexStart;
	return Align.Auto;
}
