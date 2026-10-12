import type { Canvas, Path } from "canvaskit-wasm";
import { pxOf } from "../style/class-style.js";
import type { GpuContext } from "../engine/gpu-context.js";
import { ICON_GRID, ICON_STROKE, pathsOfIcon } from "../style/icon-path.js";
import { numberProp, textProp } from "./node-props.js";
import { drawSvg } from "./node-shapes.js";
import type { SceneNode } from "./scene-node.js";

const ICON_PX = 16;

export function drawNode(node: SceneNode, canvas: Canvas): void {
	const { style, colours, context } = node;
	if (style.display === "none") return;
	const { ck, fill } = context;
	const { x, y, w, h } = node.box;
	const radius = Math.min(pxOf(style.radius, context.tokens.lengths), w / 2, h / 2);
	const rect = ck.LTRBRect(x, y, x + w, y + h);
	const rounded = radius > 0 ? ck.RRectXY(rect, radius, radius) : null;
	const background = colours.current.bg;
	if (background && background[3] > 0) {
		fill.setColor(ck.Color4f(...background));
		if (rounded) canvas.drawRRect(rounded, fill);
		else canvas.drawRect(rect, fill);
	}
	drawBorder(node, canvas, radius);
	if (style.clip) {
		canvas.save();
		if (rounded) canvas.clipRRect(rounded, ck.ClipOp.Intersect, true);
		else canvas.clipRect(rect, ck.ClipOp.Intersect, true);
	}
	drawContent(node, canvas);
	if (!node.holdsShapes) for (const child of node.children) drawNode(child, canvas);
	if (style.clip) canvas.restore();
}

function drawContent(node: SceneNode, canvas: Canvas): void {
	const { style } = node;
	const { x, y, w } = node.box;
	const left = x + style.padding.left + style.borderWidth.left;
	const top = y + style.padding.top + style.borderWidth.top;
	const contentWidth = w - style.padding.left - style.padding.right - style.borderWidth.left - style.borderWidth.right;
	const paragraph = node.type === "Text" ? node.paragraphAt(contentWidth) : null;
	if (paragraph) canvas.drawParagraph(paragraph, left, top);
	if (node.type === "Icon") drawIcon(node, canvas);
	if (node.type === "svg") drawSvg(node, canvas);
}

function drawBorder(node: SceneNode, canvas: Canvas, radius: number): void {
	const { ck, fill, stroke } = node.context;
	const border = node.colours.current.border;
	const widths = node.style.borderWidth;
	if (!border || border[3] === 0) return;
	const { x, y, w, h } = node.box;
	const uniform = widths.top === widths.right && widths.top === widths.bottom && widths.top === widths.left;
	if (uniform && widths.top > 0) {
		const half = widths.top / 2;
		const rect = ck.LTRBRect(x + half, y + half, x + w - half, y + h - half);
		stroke.setColor(ck.Color4f(...border));
		stroke.setStrokeWidth(widths.top);
		if (radius > 0) canvas.drawRRect(ck.RRectXY(rect, radius - half, radius - half), stroke);
		else canvas.drawRect(rect, stroke);
		return;
	}
	fill.setColor(ck.Color4f(...border));
	if (widths.top) canvas.drawRect(ck.XYWHRect(x, y, w, widths.top), fill);
	if (widths.bottom) canvas.drawRect(ck.XYWHRect(x, y + h - widths.bottom, w, widths.bottom), fill);
	if (widths.left) canvas.drawRect(ck.XYWHRect(x, y, widths.left, h), fill);
	if (widths.right) canvas.drawRect(ck.XYWHRect(x + w - widths.right, y, widths.right, h), fill);
}

function drawIcon(node: SceneNode, canvas: Canvas): void {
	const { ck, stroke } = node.context;
	node.iconPaths ??= iconPathsOf(node.context, textProp(node.props, "name") ?? "");
	const size = numberProp(node.props, "size") ?? ICON_PX;
	const { x, y, w, h } = node.box;
	canvas.save();
	canvas.translate(x + (w - size) / 2, y + (h - size) / 2);
	canvas.scale(size / ICON_GRID, size / ICON_GRID);
	stroke.setColor(ck.Color4f(...node.textColour()));
	stroke.setStrokeWidth(ICON_STROKE);
	for (const path of node.iconPaths) canvas.drawPath(path, stroke);
	canvas.restore();
}

function iconPathsOf({ ck }: GpuContext, name: string): Path[] {
	return pathsOfIcon(name).flatMap((svg) => {
		const path = ck.Path.MakeFromSVGString(svg);
		return path ? [path] : [];
	});
}
