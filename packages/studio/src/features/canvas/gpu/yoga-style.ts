import { Align, Display, Edge, FlexDirection, Gutter, Justify, Overflow, Wrap, loadYoga } from "yoga-layout/load";
import type { Config as YogaConfig, Node as YogaNode, Yoga } from "yoga-layout/load";
import type { AlignWord, ClassStyle, JustifyWord } from "./class-style.js";

export interface LoadedLayout {
	readonly yoga: Yoga;
	readonly yogaConfig: YogaConfig;
}

const ALIGN_OF: Readonly<Record<AlignWord, Align>> = {
	start: Align.FlexStart,
	center: Align.Center,
	end: Align.FlexEnd,
	stretch: Align.Stretch,
	baseline: Align.Baseline,
};

const JUSTIFY_OF: Readonly<Record<JustifyWord, Justify>> = {
	start: Justify.FlexStart,
	center: Justify.Center,
	end: Justify.FlexEnd,
	between: Justify.SpaceBetween,
	around: Justify.SpaceAround,
	evenly: Justify.SpaceEvenly,
};

const EDGES = [
	["top", Edge.Top],
	["right", Edge.Right],
	["bottom", Edge.Bottom],
	["left", Edge.Left],
] as const;

export async function loadLayout(): Promise<LoadedLayout> {
	const yoga = await loadYoga();
	const yogaConfig = yoga.Config.create();
	yogaConfig.setUseWebDefaults(true);
	yogaConfig.setPointScaleFactor(1);
	return { yoga, yogaConfig };
}

export function applyLayoutStyle(node: YogaNode, style: ClassStyle): void {
	node.setDisplay(style.display === "none" ? Display.None : Display.Flex);
	node.setFlexDirection(directionOf(style));
	node.setFlexWrap(style.wrap ? Wrap.Wrap : Wrap.NoWrap);
	node.setGap(Gutter.Row, style.gapRow);
	node.setGap(Gutter.Column, style.gapColumn);
	for (const [side, edge] of EDGES) {
		node.setPadding(edge, style.padding[side]);
		node.setBorder(edge, style.borderWidth[side]);
		const margin = style.margin[side];
		if (margin === "auto") node.setMarginAuto(edge);
		else node.setMargin(edge, margin ?? 0);
	}
	node.setWidth(style.width === "full" ? "100%" : (style.width ?? "auto"));
	node.setHeight(style.height === "full" ? "100%" : (style.height ?? "auto"));
	node.setMinWidth(style.minWidth);
	node.setMinHeight(style.minHeight);
	node.setMaxWidth(style.maxWidth);
	node.setFlexGrow(style.grow);
	node.setFlexShrink(style.shrink);
	node.setFlexBasis(style.basis ?? "auto");
	node.setAlignItems(style.items ? ALIGN_OF[style.items] : Align.Stretch);
	node.setAlignSelf(style.self ? ALIGN_OF[style.self] : Align.Auto);
	node.setJustifyContent(style.justify ? JUSTIFY_OF[style.justify] : Justify.FlexStart);
	node.setOverflow(style.clip ? Overflow.Hidden : Overflow.Visible);
}

function directionOf(style: ClassStyle): FlexDirection {
	if (style.display === "row") return style.reverse ? FlexDirection.RowReverse : FlexDirection.Row;
	return style.reverse ? FlexDirection.ColumnReverse : FlexDirection.Column;
}
