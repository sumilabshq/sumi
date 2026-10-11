import { ICON_TABLE } from "@widgetarium/kit/icons";

type Attributes = Readonly<Record<string, string>>;

export const ICON_GRID = 24;
export const ICON_STROKE = (1.8 * ICON_GRID) / 20;

const ICON_BODIES: Readonly<Record<string, string>> = ICON_TABLE;
const ELEMENT = /<(\w+)((?:\s+[\w-]+="[^"]*")*)\s*\/?>/g;
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g;

// TODO: draw the kit's own glyphs first, as the kit's Icon does, once the kit exports iconOf
export function pathsOfIcon(name: string): string[] {
	const body = Object.hasOwn(ICON_BODIES, name) ? ICON_BODIES[name] : undefined;
	if (body === undefined) return [];
	return [...body.matchAll(ELEMENT)].flatMap(([, tag = "", attributes = ""]) => {
		const path = pathOfElement(tag, attributesOf(attributes));
		return path ? [path] : [];
	});
}

function pathOfElement(tag: string, attributes: Attributes): string | null {
	const at = (name: string): number => Number(attributes[name] ?? 0);
	if (tag === "path") return attributes["d"] ?? null;
	if (tag === "circle") return ellipsePath(at("cx"), at("cy"), at("r"), at("r"));
	if (tag === "ellipse") return ellipsePath(at("cx"), at("cy"), at("rx"), at("ry"));
	if (tag === "line") return `M${at("x1")} ${at("y1")}L${at("x2")} ${at("y2")}`;
	if (tag === "rect") return rectPath(at("x"), at("y"), at("width"), at("height"), at("rx") || at("ry"));
	if (tag === "polyline") return pointsPath(attributes["points"] ?? "", false);
	if (tag === "polygon") return pointsPath(attributes["points"] ?? "", true);
	return null;
}

function attributesOf(written: string): Attributes {
	return Object.fromEntries([...written.matchAll(ATTRIBUTE)].map(([, name = "", value = ""]) => [name, value]));
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
	return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
}

function rectPath(x: number, y: number, width: number, height: number, corner: number): string {
	const r = Math.min(corner, width / 2, height / 2);
	if (r <= 0) return `M${x} ${y}h${width}v${height}h${-width}Z`;
	return [
		`M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
		`V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
		`H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
		`V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
	].join("");
}

function pointsPath(points: string, closed: boolean): string {
	const numbers = points
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	const pairs: string[] = [];
	for (let at = 0; at + 1 < numbers.length; at += 2) pairs.push(`${numbers[at]} ${numbers[at + 1]}`);
	return `M${pairs.join("L")}${closed ? "Z" : ""}`;
}
