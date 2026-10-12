import { pxOf } from "../style/class-style.js";
import type { ClassStyle } from "../style/class-style.js";
import type { GpuContext } from "../engine/gpu-context.js";
import { isHtmlTag } from "./node-flow.js";
import type { Rgba } from "../style/gpu-tokens.js";
import type { TextLook } from "./node-text.js";

export interface LookingNode {
	readonly type: string;
	readonly style: ClassStyle;
	readonly parent: LookingNode | null;
	readonly text: string;
	readonly context: GpuContext;
	textColour(): Rgba;
}

const DEFAULT_FONT_PX = 14;
const DEFAULT_LINE_PX = 20;
const LINE_RATIO = 1.4;

export function textLookOf(node: LookingNode): TextLook {
	const sized = inheritedOf(node, "fontSize");
	const { lengths } = node.context.tokens;
	const fontSize = sized === undefined ? (lengths["text-inherited"] ?? DEFAULT_FONT_PX) : pxOf(sized, lengths);
	const lineHeight =
		inheritedOf(node, "lineHeight") ??
		(fontSize === DEFAULT_FONT_PX ? DEFAULT_LINE_PX : Math.round(fontSize * LINE_RATIO));
	return {
		text: node.text,
		fontSize,
		lineHeight,
		weight: inheritedOf(node, "weight") ?? 400,
		family: inheritedOf(node, "family") ?? "sans",
		tracking: inheritedOf(node, "tracking") ?? 0,
		tabular: inheritedOf(node, "tabular") ?? false,
		align: inheritedOf(node, "align") ?? "left",
		colour: node.textColour(),
		truncate:
			node.style.truncate || (node.parent !== null && isHtmlTag(node.parent.type) && node.parent.style.truncate),
	};
}

function inheritedOf<K extends keyof ClassStyle>(from: LookingNode, key: K): ClassStyle[K] | undefined {
	for (let node: LookingNode | null = from; node; node = node.parent)
		if (node.style[key] !== undefined) return node.style[key];
	return undefined;
}
