import { closed, open, sharp } from "./paths.js";
import { EYE_LONGITUDE, R, item, line } from "./scene.js";
import type { Built, Frame, Scene, SceneItem } from "./scene.js";
import { TAU, add, bend, east, mul, sphere, south, stepsOf, sub, unit } from "./vector.js";
import type { Point, Vec3 } from "./vector.js";

export interface Peak {
	readonly hRim: number;
	readonly rRim: number;
	readonly length: number;
	readonly droop: number;
	readonly colours: readonly [top: string, under: string];
	readonly opacity?: number;
}

export interface Lens {
	readonly pt: (t: number, r: number) => Vec3;
	readonly rim: readonly Vec3[];
}

export interface Hung {
	readonly q: Vec3;
	readonly at: (p: Point) => Point;
}

export function peak(scene: Scene, F: Frame, { hRim, rRim, length, droop, colours, opacity = 1 }: Peak): Built {
	const base = F.ring(hRim, 0, 0);
	const angles = stepsOf(17).map((at) => -1.2 + (2.4 * at) / 16);
	const inner = angles.map((t) => add(base, mul(directionAt(F, t), rRim - 0.5)));
	const outer = angles.map((t) =>
		add(
			add(base, mul(directionAt(F, t), rRim + length * Math.pow(Math.cos(t), 0.7))),
			mul(F.a, -(1.5 + droop * Math.pow(Math.sin(t), 2))),
		),
	);
	const top = [...inner, ...outer.reverse()];
	const upper = item(sharp(top.map((p) => scene.at(p))), scene.flat(colours[0], F.a), { opacity });
	const under = item(sharp(top.map((p) => scene.at(add(p, mul(F.a, -1.8))))), scene.flat(colours[1], mul(F.a, -1)), {
		opacity,
	});
	return {
		depth: scene.at(F.ring(hRim, rRim + 8, 0))[2],
		items: scene.faces(F.a) > 0 ? [under, upper] : [upper, under],
	};
}

export function lens(side: -1 | 1, radius: number): Lens {
	const lon = side * EYE_LONGITUDE;
	const lat = -0.07;
	const centre = sphere(lon, lat, R + 5.5);
	const pt = (t: number, r: number): Vec3 =>
		add(centre, add(mul(east(lon), r * Math.cos(t)), mul(south(lon, lat), r * Math.sin(t))));
	return { pt, rim: stepsOf(36).map((k) => pt((k / 36) * TAU, radius)) };
}

export function glass(scene: Scene, one: Lens, { colour, tint }: { colour: string; tint: string }): SceneItem[] {
	const rim = one.rim.map((p) => scene.at(p));
	const glint = stepsOf(7).map((k) => one.pt(3.7 + k * 0.14, 8.5));
	return [
		item(closed(rim), tint),
		item(closed(rim), "none", { stroke: colour, width: 2.6 }),
		...scene.tube(glint, { colour: "#FFFFFF", width: 1.4, isAlways: true, opacity: 0.55 }).items,
	];
}

export function spectacles(scene: Scene, colour: string): void {
	const left = lens(-1, 11.5);
	const right = lens(1, 11.5);
	const from = left.pt(0, 11.5);
	const to = right.pt(Math.PI, 11.5);
	const bridge = add(mul(unit(add(from, to)), R + 8), [0, -2, 0]);
	for (const [side, one] of [
		[-1, left],
		[1, right],
	] as const) {
		const hinge = one.pt(side < 0 ? Math.PI : 0, 11.5);
		const ear = sphere(side * 1.6, -0.06, R - 2);
		const arm = stepsOf(13).map((k) => add(hinge, mul(sub(ear, hinge), k / 12)));
		scene.put("ahead", -60, scene.tube(arm, { colour, width: 2.2 }).items);
	}

	scene.put("ahead", 60, [
		...glass(scene, left, { colour, tint: "rgba(255,255,255,0.08)" }),
		...glass(scene, right, { colour, tint: "rgba(255,255,255,0.08)" }),
		...scene.tube(bend(from, bridge, to, 8), { colour, width: 2.4, isAlways: true }).items,
	]);
}

export function hang(scene: Scene, anchor: Vec3, swing: number): Hung {
	const q = scene.at(anchor);
	const cos = Math.cos(swing);
	const sin = Math.sin(swing);
	return { q, at: (p) => [q[0] + p[0] * cos - p[1] * sin, q[1] + p[0] * sin + p[1] * cos] };
}

export function headRing(lat: number, r: number): Vec3[] {
	return stepsOf(65).map((at) => sphere((at / 64) * TAU, lat, r));
}

export function directionAt(F: Frame, t: number): Vec3 {
	return add(mul(F.u, Math.cos(t)), mul(F.v, Math.sin(t)));
}

export function hangingLine(hung: Hung, ends: readonly Point[], stroke: { colour: string; width: number }): SceneItem {
	return line(open(ends.map(hung.at)), stroke);
}
