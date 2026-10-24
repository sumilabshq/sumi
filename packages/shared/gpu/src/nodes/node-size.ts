import type { Path } from "canvaskit-wasm";
import type { Node as YogaNode } from "yoga-layout/load";
import type { ClassStyle } from "../style/class-style.js";
import type { HostProps } from "../engine/gpu-context.js";
import { numberProp } from "./node-props.js";
import { svgSizeOf } from "./node-shapes.js";

export interface SizedNode {
	readonly type: string;
	readonly props: HostProps;
	readonly style: ClassStyle;
	readonly yoga: YogaNode;
	iconPaths: Path[] | null;
}

const ICON_PX = 16;

export function sizeIntrinsic(node: SizedNode): void {
	const size = numberProp(node.props, "size") ?? ICON_PX;
	if (node.type === "Icon") sizeTo(node, size, size);
	if (node.type === "svg") sizeTo(node, ...svgSizeOf(node.props));
	const width = numberProp(node.props, "width");
	const height = numberProp(node.props, "height");
	if (node.type === "img" && width !== undefined && height !== undefined) sizeTo(node, width, height);
}

function sizeTo(node: SizedNode, width: number, height: number): void {
	if (node.style.width === undefined) node.yoga.setWidth(width);
	if (node.style.height === undefined) node.yoga.setHeight(height);
	node.yoga.setFlexShrink(0);
	for (const path of node.iconPaths ?? []) path.delete();
	node.iconPaths = null;
}
