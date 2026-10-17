import { directionAt, glass, lens } from "../scene/accessories.js";
import { closed, hull, placed, runOf, sharp } from "../scene/paths.js";
import { R, frame, item, seatOf } from "../scene/scene.js";
import type { Built, Frame, Profile, Scene, SceneItem } from "../scene/scene.js";
import { TAU, add, bend, mul, sphere, stepsOf, sub, tilt } from "../scene/vector.js";
import type { Point, Vec3 } from "../scene/vector.js";

const PARTY_CONE: Readonly<Profile> = [
	[0, 17],
	[27, 0],
];
const BERET: Readonly<Profile> = [
	[0, 27],
	[2.5, 32.5],
	[5.5, 32],
	[8, 26],
	[9.5, 16],
	[10.2, 0],
];
const BUCKET_CROWN: Readonly<Profile> = [
	[0, 24.5],
	[12, 22.5],
	[15.5, 19.5],
	[17, 12],
	[17.5, 0],
];
const BUCKET_BRIM: Readonly<Profile> = [
	[0.5, 24],
	[-6.5, 35.5],
	[-7.8, 36],
];
const TOP_HAT: Readonly<Profile> = [
	[2.2, 15],
	[30, 16.5],
];
const TOQUE_BAND: Readonly<Profile> = [
	[0, 27],
	[11, 28.5],
];

const STAR: Readonly<readonly Point[]> = [
	[0, -4],
	[1, -1],
	[4, 0],
	[1, 1],
	[0, 4],
	[-1, 1],
	[-4, 0],
	[-1, -1],
];

export function dressParty(scene: Scene): void {
	const a = tilt(0.32, 0.06);
	const F = frame(mul(a, R - 4), a);
	const cone = scene.solid(F, {
		profile: PARTY_CONE,
		hex: "#FF4D9A",
		segments: 32,
	});
	const radiusAt = (h: number): number => 17 * (1 - h / 27) + 0.2;
	const bands = [
		[5, 8.5],
		[14, 17],
	].flatMap(
		([low = 0, high = 0]) =>
			scene.strip(F, { from: [low, radiusAt(low)], to: [high, radiusAt(high)], hex: "#FFD43B" }).items,
	);
	scene.put("hats", cone.depth, [...cone.items, ...bands]);
	const pom = scene.blob({ centres: [F.ring(28.5, 0, 0)], radii: [4.8], hex: "#7CE0FF" });
	scene.put("hats", pom.depth, pom.items);
	scene.seat(F, 0, seatOf(R - 4));
}

export function dressDesign(scene: Scene): void {
	const a = tilt(-0.42, 0.12);
	const F = frame(mul(a, R - 7), a);
	const beret = scene.solid(F, {
		profile: BERET,
		hex: "#FF4F9A",
		segments: 36,
	});
	const stalk = scene.tube([F.ring(9.6, 0, 0), F.ring(12.5, 0.6, 0), F.ring(15, 2.4, 0)], {
		colour: "#E23584",
		width: 3.4,
		isAlways: true,
	});
	const band = scene.strip(F, { from: [0, 27.4], to: [1.3, 30.2], hex: "#D93A80" });
	scene.put("hats", beret.depth, [...beret.items, ...band.items, ...stalk.items]);
	scene.seat(F, 0, seatOf(R - 7));
}

export function dressBucket(scene: Scene): void {
	const a = tilt(-0.18, 0.08);
	const F = frame(mul(a, R - 9), a);
	const crown = scene.solid(F, {
		profile: BUCKET_CROWN,
		hex: "#B98CFF",
	});
	const dot =
		scene.faces(F.u) > 0.2 ? scene.blob({ centres: [F.ring(3, 24.6, 0)], radii: [2.2], hex: "#FFD43B" }).items : [];
	const ribbon = scene.strip(F, { from: [1, 24.4], to: [5, 23.7], hex: "#FF7AB6" });
	scene.put("hats", crown.depth, [...crown.items, ...ribbon.items, ...dot]);
	const brim = scene.solid(F, {
		profile: BUCKET_BRIM,
		hex: "#A777F2",
		segments: 40,
	});
	const lining = scene.strip(F, { from: [-6.5, 35.5], to: [0.5, 24.3], hex: "#C6A2FF" });
	scene.put("hats", scene.at(F.ring(-3, 0, 0))[2], [...brim.items, ...lining.items]);
	scene.seat(F, -7.5, seatOf(R - 16.5));
}

export function dressMoney(scene: Scene): void {
	const a = tilt(0.16, 0.04);
	const F = frame(mul(a, R - 5), a);
	const brim = flatBrim(scene, F, { r: 26, height: 2.2, segments: 36, colours: ["#E0A21F", "#F0B53A", "#B88414"] });
	scene.put("hats", brim.depth, brim.items);
	const crown = scene.solid(F, {
		profile: TOP_HAT,
		hex: "#F5B52A",
		segments: 32,
	});
	scene.put("hats", scene.at(F.ring(16, 0, 0))[2], [
		...crown.items,
		...scene.strip(F, { from: [3, 15.15], to: [8.5, 15.6], hex: "#8A5A0A" }).items,
		...scene.disc(F, { h: 30, r: 16.5, hex: "#FFD27A", facing: 1 }).items,
	]);
	scene.seat(F, 0, seatOf(R - 5));
	const monocle = lens(1, 12);
	const chain = bend(monocle.pt(0.95, 12), sphere(0.95, 0.5, R + 5), sphere(0.92, 0.86, R + 2.5), 14);
	scene.put("ahead", 60, [
		...glass(scene, monocle, { colour: "#F5B52A", tint: "rgba(255,255,255,0.1)" }),
		...scene.tube(chain, { colour: "#F5B52A", width: 1.5 }).items,
	]);
}

export function dressCrown(scene: Scene): void {
	const a = tilt(0.08, 0.05);
	const F = frame(mul(a, R - 6), a);
	const r = 22.5;
	const peakAt = (t: number): number => 6 + 9 * Math.pow(0.5 + 0.5 * Math.cos(5 * t), 3);
	const ts = stepsOf(60).map((k) => (k / 60) * TAU);
	const front = runOf(ts.map((t) => scene.faces(directionAt(F, t)) > 0));
	const back = runOf(ts.map((t) => scene.faces(directionAt(F, t)) <= 0));
	const wall = (run: readonly number[]): Vec3[] => [
		...run.map((at) => scene.at(F.ring(0, r, ts[at] ?? 0))),
		...[...run].reverse().map((at) => scene.at(F.ring(peakAt(ts[at] ?? 0), r, ts[at] ?? 0))),
	];
	const tips = stepsOf(5).map((k) => (k * TAU) / 5);
	const facing = (t: number): number => scene.faces(directionAt(F, t));
	const ball = (t: number): readonly SceneItem[] =>
		scene.blob({ centres: [F.ring(peakAt(t) + 1, r, t)], radii: [1.8], hex: "#FFE08A" }).items;
	const frontWall = wall(front);
	scene.put("hats", 0, [
		...(back.length > 1 ? [item(sharp(wall(back)), "#A8720E")] : []),
		...tips.filter((t) => facing(t) <= 0).flatMap(ball),
		...(front.length > 1 ? [item(sharp(frontWall), scene.paint("#F5B52A", frontWall))] : []),
		...scene.strip(F, { from: [0, r + 0.6], to: [2.6, r + 0.6], hex: "#E0A21F" }).items,
		...tips
			.filter((t) => facing(t) > 0.1)
			.flatMap(
				(t, k) =>
					scene.blob({ centres: [F.ring(4.5, r + 0.8, t)], radii: [2.4], hex: k % 2 ? "#3B66FF" : "#FF4D6D" }).items,
			),
		...tips.filter((t) => facing(t) > 0).flatMap(ball),
	]);
	scene.seat(F, 0, seatOf(R - 6));
}

export function dressWizard(scene: Scene): void {
	const a = tilt(-0.05, 0.03);
	const F = frame(mul(a, R - 6), a);
	const brim = flatBrim(scene, F, { r: 40, height: 2, segments: 40, colours: ["#4A3BD6", "#5B4BFF", "#2E2390"] });
	scene.put("hats", brim.depth, brim.items);
	scene.seat(F, 0, seatOf(R - 6));
	const spine = bend(F.ring(2, 0, 0), F.ring(26, 0, 0), add(F.ring(36, 0, 0), add(mul(F.u, -10), mul(F.v, -12))), 6);
	const radii = spine.map((_point, at) => 23 * (1 - at / 6) + 0.6);
	const cones = stepsOf(6).map((at) => coneSegment(scene, { spine, radii, at }));
	const fill = scene.paint(
		"#5B4BFF",
		cones.flatMap((cone) => cone.points),
	);
	cones.forEach((cone, at) => {
		const band = at === 0 ? hatBand(scene, spine) : [];
		scene.put("hats", cone.depth, [item(closed(cone.points), fill), ...band]);
	});
	scene.put("hats", 1000, stars(scene, { spine, radii }));
}

export function dressToque(scene: Scene): void {
	const a = tilt(0, 0.04);
	const F = frame(mul(a, R - 8), a);
	const band = scene.solid(F, {
		profile: TOQUE_BAND,
		hex: "#F2F2EF",
		segments: 32,
	});
	const pleats = stepsOf(12).flatMap((k) => {
		const t = (k * TAU) / 12;
		const out = directionAt(F, t);
		return scene.tube([F.ring(1, 27.4, t), F.ring(10.5, 28.9, t)], {
			colour: "#C9CCD2",
			width: 1.2,
			normals: [out, out],
		}).items;
	});
	const puffs: Built[] = [
		...stepsOf(6).map((k) =>
			scene.blob({ centres: [F.ring(20, 13, (k * TAU) / 6 + 0.3)], radii: [14.5], hex: "#FFFFFF", strength: 0.1 }),
		),
		scene.blob({ centres: [F.ring(25, 0, 0)], radii: [16.5], hex: "#FFFFFF", strength: 0.1 }),
	];
	const puffItems = puffs.sort((x, y) => x.depth - y.depth).flatMap((puff) => puff.items);
	const bandItems = [
		...band.items,
		...pleats,
		...scene.strip(F, { from: [0, 27.3], to: [3.2, 27.7], hex: "#FF4D6D" }).items,
	];
	scene.put("hats", 0, scene.faces(a) > 0.12 ? [...bandItems, ...puffItems] : [...puffItems, ...bandItems]);
	scene.seat(F, 0, seatOf(R - 8));
}

interface FlatBrim {
	readonly r: number;
	readonly height: number;
	readonly segments: number;
	readonly colours: readonly [side: string, top: string, under: string];
}

function flatBrim(scene: Scene, F: Frame, { r, height, segments, colours }: FlatBrim): Built {
	const rim = scene.solid(F, {
		profile: [
			[0, r],
			[height, r],
		],
		hex: colours[0],
		segments,
	});
	return {
		depth: rim.depth,
		items: [
			...rim.items,
			...scene.disc(F, { h: height, r, hex: colours[1], facing: 1 }).items,
			...scene.disc(F, { h: 0, r, hex: colours[2], facing: -1 }).items,
		],
	};
}

interface Cone {
	readonly spine: readonly Vec3[];
	readonly radii: readonly number[];
	readonly at: number;
}

function coneSegment(scene: Scene, { spine, radii, at }: Cone): { depth: number; points: Point[] } {
	const from = spine[at] ?? [0, 0, 0];
	const to = spine[at + 1] ?? from;
	const Fi = frame(from, sub(to, from));
	const length = Math.hypot(...sub(to, from));
	const points = stepsOf(24).flatMap((k): Point[] => [
		scene.at(Fi.ring(0, radii[at] ?? 0, (k / 24) * TAU)),
		scene.at(Fi.ring(length, radii[at + 1] ?? 0, (k / 24) * TAU)),
	]);
	return { depth: scene.at(add(from, mul(sub(to, from), 0.5)))[2], points: hull(points) };
}

function hatBand(scene: Scene, spine: readonly Vec3[]): readonly SceneItem[] {
	const [base = [0, 0, 0], next = base] = spine;
	return scene.strip(frame(base, sub(next, base)), { from: [0.3, 23.2], to: [4.5, 21.6], hex: "#FFD43B" }).items;
}

function stars(scene: Scene, { spine, radii }: Omit<Cone, "at">): SceneItem[] {
	const spots: readonly (readonly [number, number])[] = [
		[2, 0.4],
		[3, -0.7],
		[4, 2.5],
		[1, -1.6],
	];
	return spots.flatMap(([at, angle]) => {
		const from = spine[at] ?? [0, 0, 0];
		const direction = directionAt(frame(from, sub(spine[at + 1] ?? from, from)), angle);
		if (scene.faces(direction) < 0.15) {
			return [];
		}

		const q = scene.at(add(from, mul(direction, (radii[at] ?? 0) + 0.3)));
		return [item(sharp(placed(q, STAR, { angle: 0, scaleX: 1 })), "#FFD43B")];
	});
}
