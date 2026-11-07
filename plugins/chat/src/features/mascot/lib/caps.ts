import { directionAt, hang, hangingLine, headRing, peak, spectacles } from "./accessories.js";
import { closed, leafShape, open, placed, sharp } from "./paths.js";
import { R, frame, item, itemsOf, line, seatOf } from "./scene.js";
import type { Frame, Profile, Scene, SceneItem } from "./scene.js";
import { TAU, add, bend, mul, shell, sphere, stepsOf, tilt, unit } from "./vector.js";
import type { Point, Vec3 } from "./vector.js";

const NEWSBOY_RIM = R - 14.5;
const NEWSBOY_CROWN: Readonly<Profile> = [
	[R + 3.5, 0],
	[R + 2.5, 14],
	[R - 1, 27],
	[R - 7, 37],
	[R - 12, 41.5],
	[NEWSBOY_RIM, 42],
];
const GOGGLE_CUP: Readonly<Profile> = [
	[0, 8.5],
	[4.5, 8.5],
	[5.2, 7],
];
const PITH_BRIM: Readonly<Profile> = [
	[0, 52],
	[1.8, 51],
];
const QUILL_SHAFT: Readonly<readonly Point[]> = [
	[0, 4],
	[0, -27],
];
const QUILL_NIB: Readonly<readonly Point[]> = [
	[0, 0],
	[0, 5],
];
const TASSEL_CORD: Readonly<readonly Point[]> = [
	[0, 0],
	[0, 12],
];
const TASSEL: Readonly<readonly Point[]> = [
	[-2.2, 11],
	[2.2, 11],
	[3.4, 22],
	[-3.4, 22],
];

export function dressPropeller(scene: Scene): void {
	const a = tilt(0, 0.03);
	const Rs = R + 2.5;
	const F = frame([0, 0, 0], a);
	const dome = scene.solid(F, { profile: shell(Rs, 0.95, 8), hex: "#3B66FF" });
	const trim = scene.strip(F, { from: rim(Rs + 0.3, 0.95), to: rim(Rs + 0.3, 0.8), hex: "#FFC83D" });
	scene.put("hats", dome.depth, [...dome.items, ...trim.items]);
	scene.seat(F, Rs * Math.cos(0.95), seatOf(Rs * Math.cos(0.95)));
	const hub3 = F.ring(Rs + 9, 0, 0);
	const blades = [0, Math.PI]
		.map((phase, k) => blade(scene, { F, hub3, turn: scene.time * 9 + phase, hex: k > 0 ? "#FFC83D" : "#FF4D6D" }))
		.sort((x, y) => x.depth - y.depth);
	scene.put("ahead", 80, [
		...scene.tube([F.ring(Rs - 0.5, 0, 0), hub3], { colour: "#C9CDD3", width: 2.6, isAlways: true }).items,
		...(blades[0]?.items ?? []),
		...scene.blob({ centres: [hub3], radii: [2.8], hex: "#FF4D6D" }).items,
		...(blades[1]?.items ?? []),
	]);
}

export function dressTravel(scene: Scene): void {
	const a = tilt(0, 0.04);
	const Rs = R + 2.5;
	const reach = 1.1;
	const F = frame([0, 0, 0], a);
	const crown = scene.solid(F, { profile: shell(Rs, reach, 8), hex: "#3BA8FF" });
	const seams = [1, 3, 5, 7, 9, 11].flatMap((k) => {
		const pts = stepsOf(11).map((at) => {
			const phi = 0.06 + ((reach - 0.06) * at) / 10;
			return F.ring((Rs + 0.3) * Math.cos(phi), (Rs + 0.3) * Math.sin(phi), (k * Math.PI) / 6);
		});
		return scene.tube(pts, { colour: "#2A86D6", width: 1.3, normals: pts.map(unit) }).items;
	});
	const button =
		scene.faces(a) > -0.2 ? scene.blob({ centres: [F.ring(Rs + 1.2, 0, 0)], radii: [3], hex: "#2A86D6" }).items : [];
	scene.put("hats", crown.depth, [...crown.items, ...seams, ...button]);
	const hRim = Rs * Math.cos(reach);
	scene.seat(F, hRim, seatOf(hRim));
	const visor = peak(scene, F, {
		hRim,
		rRim: Rs * Math.sin(reach),
		length: 16,
		droop: 7,
		colours: ["#3BA8FF", "#1F6FB5"],
	});
	scene.put("ahead", visor.depth, visor.items);
}

export function dressPith(scene: Scene): void {
	const a = tilt(0, 0.04);
	const Rs = R + 4;
	const F = frame([0, 0, 0], a);
	const dome = scene.solid(F, { profile: [[Rs + 2, 0], ...shell(Rs, 0.95, 8).slice(1)], hex: "#E2C98F" });
	const knob =
		scene.faces(a) > -0.2 ? scene.blob({ centres: [F.ring(Rs + 2.4, 0, 0)], radii: [2.4], hex: "#B89A5E" }).items : [];
	const band = scene.strip(F, { from: rim(Rs + 0.3, 0.95), to: rim(Rs + 0.3, 0.8), hex: "#7A5A33" });
	scene.put("hats", dome.depth, [...dome.items, ...band.items, ...knob]);
	const hb = Rs * Math.cos(0.95) - 1;
	const F2 = frame(mul(a, hb), a);
	const brim = scene.solid(F2, { profile: PITH_BRIM, hex: "#D4B97C", segments: 48 });
	scene.put("hats", brim.depth, [
		...brim.items,
		...scene.disc(F2, { h: 1.8, r: 51, hex: "#E8D29E", facing: 1 }).items,
		...scene.disc(F2, { h: 0, r: 52, hex: "#A68C55", facing: -1 }).items,
	]);
	scene.seat(F2, 0, seatOf(hb));
}

export function dressPilot(scene: Scene): void {
	const a = tilt(0, 0.03);
	const Rs = R + 2.2;
	const F = frame([0, 0, 0], a);
	const cap = scene.solid(F, { profile: shell(Rs, 1.08, 8), hex: "#B07A45" });
	const seam = stepsOf(11).map((at) => {
		const phi = 0.05 + at / 10;
		return F.ring((Rs + 0.3) * Math.cos(phi), (Rs + 0.3) * Math.sin(phi), 0);
	});
	scene.put("hats", cap.depth, [
		...cap.items,
		...scene.tube(seam, { colour: "#7E5530", width: 1.3, normals: seam.map(unit) }).items,
		...scene.tube(headRing(-0.66, R + 3.4), { colour: "#5A3A20", width: 4.5 }).items,
	]);
	scene.seat(F, Rs * Math.cos(1.08), seatOf(Rs * Math.cos(1.08)));
	const cups = ([-1, 1] as const).map((side) => goggle(scene, side));
	const [left = cups[0], right = left] = cups;
	if (left === undefined || right === undefined) {
		return;
	}

	const strap = bend(left, mul(unit(add(left, right)), R + 6), right, 6);
	scene.put("ahead", -10, scene.tube(strap, { colour: "#5A3A20", width: 3, isAlways: true }).items);
}

export function dressNewsboy(scene: Scene): void {
	const a = tilt(0.05, 0.2);
	const F = frame([0, 0, 0], a);
	const rimH = NEWSBOY_RIM;
	const crown = scene.solid(F, { profile: NEWSBOY_CROWN, hex: "#C49A6C" });
	const button =
		scene.faces(a) > -0.2 ? scene.blob({ centres: [F.ring(R + 4.2, 0, 0)], radii: [2.6], hex: "#9C7448" }).items : [];
	scene.put("hats", crown.depth, [...crown.items, ...button]);
	scene.seat(F, rimH, seatOf(rimH));
	const brim = peak(scene, F, { hRim: rimH, rRim: 41, length: 9, droop: 3, colours: ["#B88A5C", "#7E5C3A"] });
	scene.put("ahead", brim.depth, brim.items);
	quill(scene);
}

export function dressEyeshade(scene: Scene): void {
	const F = frame([0, 0, 0], tilt(0, 0.06));
	const rr = R + 1.8;
	scene.put("hats", 0, itemsOf(scene.strip(F, { from: rim(rr, 1.02), to: rim(rr, 0.86), hex: "#18A877" })));
	const visor = peak(scene, F, {
		hRim: rr * Math.cos(1.02),
		rRim: rr * Math.sin(1.02),
		length: 17,
		droop: 5,
		colours: ["#2BD69B", "#139A6C"],
		opacity: 0.85,
	});
	scene.put("ahead", visor.depth, visor.items);
	spectacles(scene, "#FF8A3D");
}

export function dressStudy(scene: Scene): void {
	const a = tilt(0, 0.02);
	const Rs = R + 2.5;
	const F = frame([0, 0, 0], a);
	const skull = scene.solid(F, { profile: shell(Rs, 0.86, 7), hex: "#4F35C2" });
	scene.put("hats", skull.depth, skull.items);
	scene.seat(F, Rs * Math.cos(0.86), seatOf(Rs * Math.cos(0.86)));
	const hb = Rs + 0.3;
	const corner = (h: number, k: number): Vec3 => F.ring(h, 34, (k * Math.PI) / 2);
	scene.put("hats", scene.at(F.ring(hb, 0, 0))[2], [
		...board(scene, { F, hb, corner }),
		...tassel(scene, { F, hb, corner }),
	]);
	const cord = hang(scene, corner(hb + 2.8, 3), Math.sin(scene.time * 2.1) * 0.16 - scene.look[0] * 0.3);
	scene.put("ahead", 90, [
		hangingLine(cord, TASSEL_CORD, { colour: "#F5B52A", width: 1.6 }),
		item(sharp(TASSEL.map(cord.at)), "#F5B52A"),
		...[-1.6, 0, 1.6].map((x) => hangingLine(cord, tasselThread(x), { colour: "#C98A12", width: 1 })),
	]);
}

export function dressHome(scene: Scene): void {
	const F = frame([0, 0, 0], tilt(0.08, 0.02));
	const Rb = R + 3;
	const dome = scene.solid(F, { profile: shell(Rb, 1.12, 8), hex: "#FF7A3D" });
	const ribs = stepsOf(24).flatMap((k) => {
		const pts = [0.95, 1.03, 1.11, 1.18].map((phi) =>
			F.ring((R + 6.8) * Math.cos(phi), (R + 6.8) * Math.sin(phi), (k / 24) * TAU),
		);
		return scene.tube(pts, { colour: "#FFFFFF", width: 1.3, normals: pts.map(unit), opacity: 0.22 }).items;
	});
	scene.put("hats", dome.depth, [
		...dome.items,
		...scene.strip(F, { from: rim(Rb + 0.2, 0.66), to: rim(Rb + 0.2, 0.56), hex: "#FFB48C" }).items,
		...scene.strip(F, { from: rim(R + 6.5, 0.92), to: rim(Rb, 0.92), hex: "#D9531F" }).items,
		...scene.strip(F, { from: rim(R + 6.5, 1.2), to: rim(R + 6.5, 0.92), hex: "#E8612A" }).items,
		...ribs,
	]);
	const pompom = scene.blob({ centres: [F.ring(Rb + 7.5, 0, 0)], radii: [8.5], hex: "#FFD2BC" });
	scene.put("hats", pompom.depth, pompom.items);
	scene.seat(F, (R + 6.5) * Math.cos(1.2), seatOf((R + 6.5) * Math.cos(1.2)));
}

interface Blade {
	readonly F: Frame;
	readonly hub3: Vec3;
	readonly turn: number;
	readonly hex: string;
}

function blade(scene: Scene, { F, hub3, turn, hex }: Blade): { depth: number; items: SceneItem[] } {
	const hub = scene.at(hub3);
	const tip = scene.at(add(hub3, mul(directionAt(F, turn), 21)));
	const along: Point = [tip[0] - hub[0], tip[1] - hub[1]];
	const length = Math.max(Math.hypot(along[0], along[1]), 0.01);
	const n: Point = [-along[1] / length, along[0] / length];
	const middle: Point = [hub[0] + along[0] * 0.55, hub[1] + along[1] * 0.55];
	const pts: Point[] = [
		[hub[0] + n[0] * 1.2, hub[1] + n[1] * 1.2],
		[middle[0] + n[0] * 4.8, middle[1] + n[1] * 4.8],
		[tip[0], tip[1]],
		[middle[0] - n[0] * 4.8, middle[1] - n[1] * 4.8],
		[hub[0] - n[0] * 1.2, hub[1] - n[1] * 1.2],
	];
	return { depth: tip[2], items: [item(closed(pts), scene.paint(hex, pts))] };
}

function goggle(scene: Scene, side: -1 | 1): Vec3 {
	const direction = sphere(side * 0.32, -0.68, 1);
	const F = frame(mul(direction, R + 3), direction);
	const cup = scene.solid(F, { profile: GOGGLE_CUP, hex: "#C9CDD3", segments: 24 });
	scene.put("ahead", cup.depth, [...cup.items, ...scene.disc(F, { h: 5.3, r: 6.3, hex: "#6FD0FF", facing: 1 }).items]);
	return F.ring(3, 0, 0);
}

function quill(scene: Scene): void {
	const q = scene.at(sphere(1.05, -0.62, R + 5));
	if (scene.isHidden(q)) {
		return;
	}

	const turn = { angle: 0.42 - scene.yaw * 0.3 + Math.sin(scene.time * 1.9) * 0.05, scaleX: 1 };
	const vane = placed(q, leafShape(30, 5.5), turn);
	const tip = placed(
		q,
		leafShape(11, 4.2).map(([x, y]): Point => [x, y - 19]),
		turn,
	);
	scene.put("ahead", q[2] + 30, [
		item(closed(vane), scene.paint("#F6F0E2", vane)),
		item(closed(tip), scene.paint("#5B8CFF", tip)),
		line(open(placed(q, QUILL_SHAFT, turn)), { colour: "#C9B88F", width: 1.1 }),
		line(open(placed(q, QUILL_NIB, turn)), { colour: "#3C3D42", width: 1.6 }),
	]);
}

interface Board {
	readonly F: Frame;
	readonly hb: number;
	readonly corner: (h: number, k: number) => Vec3;
}

function board(scene: Scene, { F, hb, corner }: Board): SceneItem[] {
	const sides = stepsOf(4).flatMap((k) => {
		const middle = (k * Math.PI) / 2 + Math.PI / 4;
		const corners = [corner(hb, k), corner(hb, k + 1), corner(hb + 2.8, k + 1), corner(hb + 2.8, k)];
		return scene.face(corners, "#5B3FD6", { normal: directionAt(F, middle), isCulled: true }).items;
	});
	const square = (h: number): Vec3[] => stepsOf(4).map((k) => corner(h, k));
	return [
		...sides,
		...scene.face(square(hb + 2.8), "#7C5CFF", { normal: F.a, isCulled: true }).items,
		...scene.face(square(hb), "#3F2A9E", { normal: mul(F.a, -1), isCulled: true }).items,
	];
}

function tassel(scene: Scene, { F, hb, corner }: Board): SceneItem[] {
	if (scene.faces(F.a) <= 0) {
		return [];
	}

	return [
		...scene.tube([F.ring(hb + 3, 0, 0), corner(hb + 3, 3)], { colour: "#F5B52A", width: 1.6, isAlways: true }).items,
		...scene.blob({ centres: [F.ring(hb + 3.6, 0, 0)], radii: [2.4], hex: "#F5B52A" }).items,
	];
}

function rim(radius: number, phi: number): Point {
	return [radius * Math.cos(phi), radius * Math.sin(phi)];
}

function tasselThread(x: number): Point[] {
	return [
		[x, 15],
		[x * 1.4, 21.5],
	];
}
