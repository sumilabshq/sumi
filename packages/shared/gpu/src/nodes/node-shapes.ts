import type { Canvas, Path } from "canvaskit-wasm";
import type { GpuContext, HostProps } from "../engine/gpu-context.js";
import type { Rgba } from "../style/gpu-tokens.js";
import { SHAPE_HOLDERS } from "../style/html-tags.js";
import { pathOfShape, pathsOfMarkup } from "../style/icon-path.js";
import { innerHtmlOf, numberProp, textProp } from "./node-props.js";
import type { Box } from "./scene-node.js";

export interface ShapeNode {
	readonly type: string;
	readonly props: HostProps;
	readonly children: readonly ShapeNode[];
	readonly parent: ShapeNode | null;
	readonly context: GpuContext;
	readonly box: Box;
	iconPaths: Path[] | null;
	textColour(): Rgba;
}

type ViewBox = readonly [number, number, number, number];

// TODO: a named fill or stroke colour draws in the text colour
const GLYPH_CLASS = "wg-kit-icon-glyph";
const DEFAULT_SVG_PX = 24;
const GLYPH_STROKE_PER_GRID = 1.8 / 20;
const NONE = "none";

export function svgSizeOf(props: HostProps): readonly [number, number] {
	return [numberProp(props, "width") ?? DEFAULT_SVG_PX, numberProp(props, "height") ?? DEFAULT_SVG_PX];
}

export function dropShapePaths(from: ShapeNode): void {
	for (let node: ShapeNode | null = from; node; node = node.parent) {
		if (node.type !== "svg") continue;
		for (const path of node.iconPaths ?? []) path.delete();
		node.iconPaths = null;
		return;
	}
}

export function drawSvg(node: ShapeNode, canvas: Canvas): void {
	const { ck, fill, stroke } = node.context;
	const { x, y, w, h } = node.box;
	const [minX, minY, width, height] = viewBoxOf(node.props) ?? [0, 0, w, h];
	if (width <= 0 || height <= 0) return;
	node.iconPaths ??= pathsOf(node);
	const scale = Math.min(w / width, h / height);
	const isGlyph = textProp(node.props, "className")?.includes(GLYPH_CLASS) === true;
	const fills = (textProp(node.props, "fill") ?? (isGlyph ? NONE : "currentColor")) !== NONE;
	const strokes = (textProp(node.props, "stroke") ?? (isGlyph ? "currentColor" : NONE)) !== NONE;
	const colour = ck.Color4f(...node.textColour());
	canvas.save();
	canvas.translate(x + (w - width * scale) / 2 - minX * scale, y + (h - height * scale) / 2 - minY * scale);
	canvas.scale(scale, scale);
	fill.setColor(colour);
	stroke.setColor(colour);
	stroke.setStrokeWidth(numberProp(node.props, "strokeWidth") ?? width * GLYPH_STROKE_PER_GRID);
	for (const path of node.iconPaths) {
		if (fills) canvas.drawPath(path, fill);
		if (strokes) canvas.drawPath(path, stroke);
	}
	canvas.restore();
}

function pathsOf(node: ShapeNode): Path[] {
	const { ck } = node.context;
	return svgPathsOf(node).flatMap((svg) => {
		const path = ck.Path.MakeFromSVGString(svg);
		return path ? [path] : [];
	});
}

function svgPathsOf(node: ShapeNode): string[] {
	const markup = innerHtmlOf(node.props);
	const own = markup ? pathsOfMarkup(markup) : [];
	return [...own, ...node.children.flatMap(shapePathsOf)];
}

function shapePathsOf(node: ShapeNode): string[] {
	if (SHAPE_HOLDERS.has(node.type)) return node.children.flatMap(shapePathsOf);
	const path = pathOfShape(node.type, attributesOf(node.props));
	return path ? [path] : [];
}

function attributesOf(props: HostProps): Readonly<Record<string, string>> {
	return Object.fromEntries(
		Object.keys(props).flatMap((name) => {
			const value = textProp(props, name);
			return value === undefined ? [] : [[name, value]];
		}),
	);
}

function viewBoxOf(props: HostProps): ViewBox | null {
	const numbers = (textProp(props, "viewBox") ?? "")
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	const [minX = 0, minY = 0, width = 0, height = 0] = numbers;
	return numbers.length === 4 && numbers.every(Number.isFinite) ? [minX, minY, width, height] : null;
}
