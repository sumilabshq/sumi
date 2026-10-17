import { hang, hangingLine } from "../scene/accessories.js";
import type { Hung } from "../scene/accessories.js";
import { closed, leafShape, open, placed, sharp } from "../scene/paths.js";
import { R, frame, item, line } from "../scene/scene.js";
import type { Profile, Scene, SceneItem } from "../scene/scene.js";
import { TAU, add, bend, east, mul, sphere, stepsOf, tilt, unit } from "../scene/vector.js";
import type { Point, Vec3 } from "../scene/vector.js";

const EARCUP: Readonly<Profile> = [
	[0, 10.5],
	[2, 12],
	[7.5, 12],
	[10, 9],
	[10.8, 0],
];

const PENCIL: Readonly<readonly (readonly [from: number, to: number, fromR: number, toR: number, hex: string])[]> = [
	[-15, -11.5, 3.2, 3.2, "#FF7AA2"],
	[-11.5, -9, 3.5, 3.5, "#C9CDD3"],
	[-9, 9, 3.2, 3.2, "#F5B52A"],
	[9, 13.5, 3.2, 1.1, "#E8D3A8"],
	[13.5, 15.5, 1.1, 0, "#3C3D42"],
];

export function dressDev(scene: Scene): void {
	const s = R + 3.5;
	const arch = stepsOf(29).map((at): Vec3 => {
		const t = -1.42 + (2.84 * at) / 28;
		return [s * Math.sin(t), -s * Math.cos(t), -3];
	});
	scene.put("ahead", -90, [
		...scene.tube(arch, { colour: "#2448D6", width: 7.5 }).items,
		...scene.tube(arch, { colour: "#3B66FF", width: 4.8 }).items,
		...scene.tube(arch, { colour: "#A8C0FF", width: 1.4, opacity: 0.6 }).items,
	]);
	for (const side of [-1, 1]) {
		earcup(scene, side);
	}

	const tip: Vec3 = [17, 25, 38];
	scene.put("ahead", 90, [
		...scene.tube(bend([R + 5, 10, 4], [R + 5, 27, 28], tip, 16), { colour: "#2E5BFF", width: 2.8 }).items,
		...scene.blob({ centres: [tip], radii: [3.8], hex: "#1C3DC4" }).items,
	]);
}

export function dressWriting(scene: Scene): void {
	const y0 = (R + 4) * Math.sin(0.66);
	const rr = (R + 4) * Math.cos(0.66);
	const ring = (t: number, radius: number, dy: number): Vec3 => [radius * Math.sin(t), y0 + dy, radius * Math.cos(t)];
	const loop = stepsOf(61).map((at) => ring((at / 60) * TAU, rr, 0));
	const stripes = [-1.05, -0.35, 0.35, 1.05].flatMap(
		(t) => scene.tube([ring(t, rr + 1, -4.2), ring(t, rr + 1, 4.2)], { colour: "#E07A5F", width: 2.6 }).items,
	);
	scene.put("ahead", 0, [
		...scene.tube(loop, { colour: "#D9C291", width: 11 }).items,
		...scene.tube(loop, { colour: "#F4E5C2", width: 8 }).items,
		...scene.tube(
			loop.map((p) => add(p, [0, -2.4, 0])),
			{ colour: "#FFFFFF", width: 1.6, opacity: 0.5 },
		).items,
		...stripes,
	]);
	const tail = hang(scene, ring(0.62, rr + 2, 2), Math.sin(scene.time * 2.3) * 0.13 - scene.look[0] * 0.2);
	if (!scene.isHidden(tail.q)) {
		scene.put("ahead", tail.q[2] + 5, scarfTail(tail));
	}

	pencil(scene);
}

export function dressSprout(scene: Scene): void {
	const sway = Math.sin(scene.time * 1.7) * 0.12;
	const base = mul(unit([0.04, -1, 0.1]), R - 1);
	const up = unit([0.08 + sway, -1, 0.14]);
	const stem = stepsOf(9).map((at) => {
		const s = at / 8;
		return add(base, add(mul(up, 15 * s), [sway * 10 * s * s, 0, 0]));
	});
	const top = scene.at(stem[8] ?? base);
	const leaves = (
		[
			[-1.05, 17, 6.5, "#35B36A"],
			[0.95, 19, 7, "#43C779"],
		] as const
	).flatMap(([angle, length, width, hex]) => {
		const turn = { angle: angle + sway - scene.yaw * 0.35, scaleX: 0.8 + 0.2 * Math.cos(scene.yaw + angle * 0.5) };
		const pts = placed(top, leafShape(length, width), turn);
		const vein = placed(
			top,
			[
				[0, 0],
				[0, -length * 0.85],
			],
			{ ...turn, scaleX: 1 },
		);
		return [item(closed(pts), scene.paint(hex, pts)), line(open(vein), { colour: "#2E9A57", width: 1.2 })];
	});
	scene.put("ahead", top[2], [...scene.tube(stem, { colour: "#2E9A57", width: 3.2 }).items, ...leaves]);
}

export function dressSweatband(scene: Scene): void {
	const F = frame([0, 0, 0], tilt(0, -0.25));
	const bandRing = (phi: number, r: number): Vec3[] =>
		stepsOf(65).map((at) => F.ring(r * Math.cos(phi), r * Math.sin(phi), (at / 64) * TAU));
	const main = bandRing(0.85, R + 2.6);
	scene.put("hats", 0, [
		...scene.tube(main, { colour: "#C92D4B", width: 10 }).items,
		...scene.tube(main, { colour: "#FF4D6D", width: 7.5 }).items,
		...scene.tube(bandRing(0.85, R + 3.6), { colour: "#FFFFFF", width: 2.2, opacity: 0.9 }).items,
		...scene.tube(bandRing(0.78, R + 3.4), { colour: "#FFFFFF", width: 1.4, opacity: 0.35 }).items,
	]);
}

function earcup(scene: Scene, side: number): void {
	const F = frame([side * (R - 1), 2, -1], [side, 0, 0]);
	const cup = scene.solid(F, {
		profile: EARCUP,
		hex: "#2E5BFF",
	});
	const depth = scene.at(F.ring(6, 0, 0))[2];
	scene.put(depth < -6 ? "behind" : "ahead", depth, [
		...cup.items,
		...scene.disc(F, { h: 10.3, r: 6, hex: "#6A8CFF", facing: 1 }).items,
	]);
}

function scarfTail(tail: Hung): SceneItem[] {
	const cloth: readonly Point[] = [
		[-4.6, -2],
		[4.6, -2],
		[5.2, 10],
		[4.6, 21],
		[-4.4, 21],
		[-4.9, 10],
	];
	return [
		item(sharp(cloth.map(tail.at)), "#EBD7A9"),
		...[8, 15].map((y) =>
			hangingLine(
				tail,
				[
					[-4.9, y],
					[5.1, y],
				],
				{ colour: "#E07A5F", width: 2.4 },
			),
		),
		...[-3, 0, 3].map((x) =>
			hangingLine(
				tail,
				[
					[x, 20.5],
					[x * 1.1, 25],
				],
				{ colour: "#EBD7A9", width: 1.6 },
			),
		),
	];
}

function pencil(scene: Scene): void {
	const along = unit(add(east(-0.5), [0, -0.25, 0]));
	const centre = mul(sphere(-0.5, -0.95, 1), R + 3.4);
	for (const [from, to, fromR, toR, hex] of PENCIL) {
		const built = scene.solid(frame(centre, along), {
			profile: [
				[from, fromR],
				[to, toR],
			],
			hex,
			segments: 16,
		});
		scene.put("ahead", built.depth + 40, built.items);
	}
}
