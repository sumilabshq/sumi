import { centreOf, closed, fmt, hull, open, radiusOf, runOf, shade, sharp } from "./paths.js";
import { TAU, add, cross, dot, east, mul, sphere, south, stepsOf, sub, unit } from "./vector.js";
import type { Point, Vec3 } from "./vector.js";

export type Look = readonly [x: number, y: number];

export type Layer = "behind" | "hats" | "ahead";

export interface SceneItem {
	readonly d: string;
	readonly fill: string;
	readonly stroke: string;
	readonly width: number;
	readonly opacity: number;
	readonly clip: string | null;
	readonly rule: "nonzero" | "evenodd";
}

export interface ScenePaint {
	readonly id: string;
	readonly x1: string;
	readonly y1: string;
	readonly x2: string;
	readonly y2: string;
	readonly light: string;
	readonly base: string;
	readonly dark: string;
}

export interface MascotScene {
	readonly paints: readonly ScenePaint[];
	readonly behind: readonly SceneItem[];
	readonly hats: readonly SceneItem[];
	readonly ahead: readonly SceneItem[];
	readonly leftEye: string;
	readonly rightEye: string;
	readonly mouth: string;
}

export interface SceneIds {
	readonly paint: string;
	readonly shine: string;
	readonly clip: string;
}

export interface Built {
	readonly depth: number;
	readonly items: readonly SceneItem[];
}

export interface Frame {
	readonly a: Vec3;
	readonly u: Vec3;
	readonly v: Vec3;
	readonly ring: (h: number, r: number, t: number) => Vec3;
}

export type Profile = readonly (readonly [height: number, radius: number])[];

export interface Solid {
	readonly profile: Profile;
	readonly hex: string;
	readonly segments?: number;
	readonly strength?: number;
}

export interface Blob {
	readonly centres: readonly Vec3[];
	readonly radii: readonly number[];
	readonly hex: string;
	readonly strength?: number;
}

export interface Band {
	readonly from: Point;
	readonly to: Point;
	readonly hex: string;
}

export interface Disc {
	readonly h: number;
	readonly r: number;
	readonly hex: string;
	readonly facing: 1 | -1;
}

export interface Facing {
	readonly normal?: Vec3;
	readonly isCulled?: boolean;
	readonly back?: string;
	readonly isSmooth?: boolean;
}

export interface Stroke {
	readonly colour: string;
	readonly width: number;
	readonly opacity?: number;
	readonly isAlways?: boolean;
	readonly normals?: readonly Vec3[];
}

export const R = 44;
export const EYE_LONGITUDE = Math.asin(12.5 / R);

const CENTRE: Readonly<Point> = [60, 69];
const LIGHT = unit([-0.45, -0.75, 0.5]);
const GLOW: Readonly<Point> = [-0.514, -0.857];
const NO_ITEMS: Built = { depth: 0, items: [] };

export function item(d: string, fill: string, extra: Partial<SceneItem> = {}): SceneItem {
	return { d, fill, stroke: "none", width: 0, opacity: 1, clip: null, rule: "nonzero", ...extra };
}

export function line(d: string, stroke: Stroke): SceneItem {
	return item(d, "none", { stroke: stroke.colour, width: stroke.width, opacity: stroke.opacity ?? 1 });
}

export function frame(origin: Vec3, axis: Vec3, front: Vec3 = [0, 0, 1]): Frame {
	const a = unit(axis);
	const u = unit(sub(front, mul(a, dot(front, a))));
	const v = cross(a, u);
	return {
		a,
		u,
		v,
		ring: (h, r, t) => add(add(origin, mul(a, h)), add(mul(u, r * Math.cos(t)), mul(v, r * Math.sin(t)))),
	};
}

export const seatOf = (h: number): number => Math.sqrt(Math.max(R * R - h * h, 0));

export class Scene {
	readonly yaw: number;
	private readonly turn: { readonly cy: number; readonly sy: number; readonly cp: number; readonly sp: number };
	private readonly paints: ScenePaint[] = [];
	private readonly layers: Record<Layer, Built[]> = { behind: [], hats: [], ahead: [] };
	private readonly seats: string[] = [];

	constructor(
		readonly look: Look,
		readonly time: number,
		private readonly ids: SceneIds,
	) {
		this.yaw = look[0] * 0.75;
		const pitch = look[1] * 0.3;
		this.turn = { cy: Math.cos(this.yaw), sy: Math.sin(this.yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
	}

	rot(p: Vec3): Vec3 {
		const { cy, sy, cp, sp } = this.turn;
		const x = p[0] * cy + p[2] * sy;
		const z = -p[0] * sy + p[2] * cy;
		return [x, p[1] * cp + z * sp, -p[1] * sp + z * cp];
	}

	at(p: Vec3): Vec3 {
		const q = this.rot(p);
		return [CENTRE[0] + q[0], CENTRE[1] + q[1], q[2]];
	}

	isHidden(q: Vec3): boolean {
		return q[2] < 0 && Math.hypot(q[0] - CENTRE[0], q[1] - CENTRE[1]) < R - 0.5;
	}

	faces(direction: Vec3): number {
		return this.rot(direction)[2];
	}

	put(layer: Layer, depth: number, items: readonly SceneItem[]): void {
		if (items.length > 0) {
			this.layers[layer].push({ depth, items });
		}
	}

	paint(hex: string, points: readonly Point[], strength = 0.3): string {
		const centre = centreOf(points);
		const radius = radiusOf(points, centre);
		const id = `${this.ids.paint}${this.paints.length}`;
		this.paints.push({
			id,
			x1: fmt(centre[0] + GLOW[0] * radius),
			y1: fmt(centre[1] + GLOW[1] * radius),
			x2: fmt(centre[0] - GLOW[0] * radius),
			y2: fmt(centre[1] - GLOW[1] * radius),
			light: shade(hex, strength),
			base: hex,
			dark: shade(hex, -0.36),
		});
		return `url(#${id})`;
	}

	flat(hex: string, normal: Vec3): string {
		return shade(hex, (dot(this.rot(normal), LIGHT) - 0.45) * 0.7);
	}

	solid(F: Frame, { profile, hex, segments = 28, strength }: Solid): Built {
		const points = profile.flatMap(([h, r]) =>
			r < 0.01 ? [this.at(F.ring(h, 0, 0))] : stepsOf(segments).map((k) => this.at(F.ring(h, r, (k / segments) * TAU))),
		);
		const height = profile.reduce((sum, [h]) => sum + h, 0);
		const shape = hull(points);
		return {
			depth: this.at(F.ring(height / profile.length, 0, 0))[2],
			items: [item(closed(shape), this.paint(hex, shape, strength))],
		};
	}

	blob({ centres, radii, hex, strength }: Blob): Built {
		const projected = centres.map((centre) => this.at(centre));
		const points = projected.flatMap((q, at) =>
			stepsOf(24).map((k): Point => {
				const radius = radii[at] ?? 0;
				return [q[0] + radius * Math.cos((k / 24) * TAU), q[1] + radius * Math.sin((k / 24) * TAU)];
			}),
		);
		const shape = hull(points);
		return {
			depth: projected.reduce((sum, q) => sum + q[2] / projected.length, 0),
			items: [item(closed(shape), this.paint(hex, shape, strength))],
		};
	}

	strip(F: Frame, { from, to, hex }: Band): Built {
		const ts = stepsOf(72).map((k) => (k / 72) * TAU);
		const run = runOf(ts.map((t) => this.faces(bandNormal(F, t, { from, to })) > 0));
		const depth = this.at(F.ring((from[0] + to[0]) / 2, 0, 0))[2];
		if (run.length === 0) {
			return NO_ITEMS;
		}

		if (run.length === ts.length) {
			const inner = ts.map((t) => this.at(F.ring(from[0], from[1], t)));
			const outer = ts.map((t) => this.at(F.ring(to[0], to[1], t)));
			const fill = this.paint(hex, [...inner, ...outer]);
			return { depth, items: [item(`${sharp(inner)} ${sharp(outer)}`, fill, { rule: "evenodd" })] };
		}

		const near = run.map((at) => this.at(F.ring(from[0], from[1], ts[at] ?? 0)));
		const far = [...run].reverse().map((at) => this.at(F.ring(to[0], to[1], ts[at] ?? 0)));
		const points = [...near, ...far];
		return { depth, items: [item(sharp(points), this.paint(hex, points))] };
	}

	disc(F: Frame, { h, r, hex, facing }: Disc): Built {
		const normal = mul(F.a, facing);
		if (this.faces(normal) <= 0) {
			return NO_ITEMS;
		}

		const points = stepsOf(40).map((k) => this.at(F.ring(h, r, (k / 40) * TAU)));
		return { depth: this.at(F.ring(h, 0, 0))[2], items: [item(closed(points), this.flat(hex, normal))] };
	}

	face(corners: readonly Vec3[], hex: string, facing: Facing = {}): Built {
		const normal = facing.normal ?? normalOf(corners);
		const isFront = this.faces(normal) > 0;
		if (!isFront && facing.isCulled === true) {
			return NO_ITEMS;
		}

		const points = corners.map((corner) => this.at(corner));
		const colour = isFront ? hex : (facing.back ?? hex);
		return {
			depth: points.reduce((sum, p) => sum + p[2], 0) / points.length,
			items: [item(outlineOf(points, facing), this.flat(colour, isFront ? normal : mul(normal, -1)))],
		};
	}

	tube(points: readonly Vec3[], stroke: Stroke): Built {
		const projected = points.map((point) => this.at(point));
		const seen = points.map((point, at) => this.isSeen(point, projected[at] ?? point, stroke.normals?.[at]));
		const runs = runsOf(projected, seen, stroke.isAlways === true);
		return {
			depth: projected.reduce((sum, q) => sum + q[2] / projected.length, 0),
			items: runs.map((run) => line(open(run), stroke)),
		};
	}

	seat(F: Frame, h: number, r: number): void {
		if (this.faces(F.a) >= 0) {
			return;
		}

		const centre = this.at(F.ring(h, 0, 0));
		const points = stepsOf(48).map((k) => this.at(F.ring(h, r, (k / 48) * TAU)));
		const run = runOf(points.map((point) => point[2] >= centre[2]));
		if (run.length < 2 || run.length === points.length) {
			return;
		}

		this.seats.push(seatOverlay(run.map((at) => points[at] ?? centre)));
	}

	decal(lon: number, lat: number): string {
		const q = this.at(sphere(lon, lat, R));
		const across = this.rot(east(lon));
		const down = this.rot(south(lon, lat));
		return `matrix(${[across[0], across[1], down[0], down[1], q[0], q[1]].map(fmt).join(", ")})`;
	}

	finished(): MascotScene {
		const seats = this.seats.map((d) => item(d, `url(#${this.ids.shine})`, { clip: `url(#${this.ids.clip})` }));
		return {
			paints: this.paints,
			behind: ordered(this.layers.behind),
			hats: [...ordered(this.layers.hats), ...seats],
			ahead: ordered(this.layers.ahead),
			leftEye: this.decal(-EYE_LONGITUDE, -0.07),
			rightEye: this.decal(EYE_LONGITUDE, -0.07),
			mouth: this.decal(0, 0.36),
		};
	}

	private isSeen(point: Vec3, q: Vec3, normal: Vec3 | undefined): boolean {
		if (normal !== undefined) {
			return this.faces(normal) > 0.02;
		}

		return !this.isHidden(q) && Math.hypot(point[0], point[1], point[2]) >= R - 0.5;
	}
}

export function itemsOf(built: Built): readonly SceneItem[] {
	return built.items;
}

function normalOf(corners: readonly Vec3[]): Vec3 {
	const [first = [0, 0, 0], second = first, third = first] = corners;
	return unit(cross(sub(second, first), sub(third, first)));
}

function outlineOf(points: readonly Vec3[], facing: Facing): string {
	return facing.isSmooth === true ? closed(points) : sharp(points);
}

function bandNormal(F: Frame, t: number, { from, to }: Pick<Band, "from" | "to">): Vec3 {
	const direction = add(mul(F.u, Math.cos(t)), mul(F.v, Math.sin(t)));
	return sub(mul(direction, to[0] - from[0]), mul(F.a, to[1] - from[1]));
}

function runsOf(projected: readonly Vec3[], seen: readonly boolean[], isAlways: boolean): Vec3[][] {
	const runs: Vec3[][] = [[]];
	projected.forEach((q, at) => {
		if (isAlways || seen[at] === true) {
			runs[runs.length - 1]?.push(q);
			return;
		}

		runs.push([]);
	});
	return runs.filter((run) => run.length > 1);
}

function seatOverlay(arc: Vec3[]): string {
	const [first = [0, 0, 0]] = arc;
	const ordered = first[0] > (arc[arc.length - 1] ?? first)[0] ? [...arc].reverse() : arc;
	const start = ordered[0] ?? first;
	const end = ordered[ordered.length - 1] ?? first;
	return sharp([
		...ordered,
		[end[0] + 70, end[1]],
		[end[0] + 70, 240],
		[start[0] - 70, 240],
		[start[0] - 70, start[1]],
	]);
}

function ordered(parts: readonly Built[]): SceneItem[] {
	return [...parts].sort((a, b) => a.depth - b.depth).flatMap((part) => part.items);
}
