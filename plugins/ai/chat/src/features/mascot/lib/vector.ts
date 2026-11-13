export type Vec3 = readonly [x: number, y: number, z: number];

export type Point = readonly [x: number, y: number, ...depth: number[]];

export const TAU = Math.PI * 2;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];

export const unit = (a: Vec3): Vec3 => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));

export const sphere = (lon: number, lat: number, r: number): Vec3 => [
	r * Math.sin(lon) * Math.cos(lat),
	r * Math.sin(lat),
	r * Math.cos(lon) * Math.cos(lat),
];

export const east = (lon: number): Vec3 => [Math.cos(lon), 0, -Math.sin(lon)];

export const south = (lon: number, lat: number): Vec3 => [
	-Math.sin(lon) * Math.sin(lat),
	Math.cos(lat),
	-Math.cos(lon) * Math.sin(lat),
];

export const tilt = (x: number, z: number): Vec3 => unit([x, -1, z]);

export function bend(from: Vec3, through: Vec3, to: Vec3, count: number): Vec3[] {
	return Array.from({ length: count + 1 }, (_unused, at) => {
		const t = at / count;
		return add(add(mul(from, (1 - t) * (1 - t)), mul(through, 2 * (1 - t) * t)), mul(to, t * t));
	});
}

export function shell(radius: number, reach: number, steps: number): [number, number][] {
	return Array.from({ length: steps + 1 }, (_unused, at) => {
		const phi = (reach * at) / steps;
		return [radius * Math.cos(phi), radius * Math.sin(phi)];
	});
}

export function stepsOf(count: number): number[] {
	return Array.from({ length: count }, (_unused, at) => at);
}
