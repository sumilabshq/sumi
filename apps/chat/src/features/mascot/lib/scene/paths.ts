import type { Point } from "./vector.js";

export const fmt = (n: number): string => n.toFixed(2);

export function hull(points: readonly Point[]): Point[] {
	const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	return [...sweep(sorted), ...sweep([...sorted].reverse())];
}

export function closed(points: readonly Point[]): string {
	const first = midway(points[points.length - 1] ?? [0, 0], points[0] ?? [0, 0]);
	const curves = points.map((point, at) => {
		const next = midway(point, points[(at + 1) % points.length] ?? point);
		return ` Q${fmt(point[0])} ${fmt(point[1])} ${fmt(next[0])} ${fmt(next[1])}`;
	});
	return `M${fmt(first[0])} ${fmt(first[1])}${curves.join("")}Z`;
}

export function sharp(points: readonly Point[]): string {
	return `M${points.map((point) => `${fmt(point[0])} ${fmt(point[1])}`).join(" L")}Z`;
}

export function open(points: readonly Point[]): string {
	const [first = [0, 0]] = points;
	const last = points[points.length - 1] ?? first;
	const curves = points.slice(1, -1).map((point, at) => {
		const next = midway(point, points[at + 2] ?? point);
		return ` Q${fmt(point[0])} ${fmt(point[1])} ${fmt(next[0])} ${fmt(next[1])}`;
	});
	return `M${fmt(first[0])} ${fmt(first[1])}${curves.join("")} L${fmt(last[0])} ${fmt(last[1])}`;
}

export function runOf(flags: readonly boolean[]): number[] {
	const count = flags.length;
	if (flags.every(Boolean)) {
		return flags.map((_flag, at) => at);
	}

	const start = flags.findIndex((flag, at) => flag && !flags[(at - 1 + count) % count]);
	if (start < 0) {
		return [];
	}

	const run: number[] = [];
	for (let at = start; flags[at % count] === true && run.length < count; at += 1) {
		run.push(at % count);
	}

	return run;
}

export function centreOf(points: readonly Point[]): Point {
	const total = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
	return [total[0] / points.length, total[1] / points.length];
}

export function radiusOf(points: readonly Point[], centre: Point): number {
	return Math.max(...points.map((point) => Math.hypot(point[0] - centre[0], point[1] - centre[1])));
}

export function shade(hex: string, amount: number): string {
	const goal = amount > 0 ? 255 : 0;
	const share = Math.min(Math.abs(amount), 1);
	const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
	return `rgb(${channels.map((value) => Math.round(value + (goal - value) * share)).join(",")})`;
}

export function placed(origin: Point, points: readonly Point[], turn: { angle: number; scaleX: number }): Point[] {
	const cos = Math.cos(turn.angle);
	const sin = Math.sin(turn.angle);
	return points.map((point) => [
		origin[0] + point[0] * turn.scaleX * cos - point[1] * sin,
		origin[1] + point[0] * turn.scaleX * sin + point[1] * cos,
	]);
}

export function leafShape(length: number, width: number): Point[] {
	const side = (sign: number): Point[] =>
		Array.from({ length: 11 }, (_unused, at) => {
			const s = at / 10;
			return [sign * width * Math.sin(Math.PI * s) * (1 - 0.25 * s), -length * s];
		});
	return [...side(1), ...side(-1).reverse()];
}

function midway(a: Point, b: Point): Point {
	return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function sweep(points: readonly Point[]): Point[] {
	const kept: Point[] = [];
	for (const point of points) {
		while (kept.length >= 2 && turnOf(kept[kept.length - 2], kept[kept.length - 1], point) <= 0) {
			kept.pop();
		}

		kept.push(point);
	}

	kept.pop();
	return kept;
}

function turnOf(o: Point | undefined, a: Point | undefined, b: Point): number {
	if (o === undefined || a === undefined) {
		return 1;
	}

	return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
