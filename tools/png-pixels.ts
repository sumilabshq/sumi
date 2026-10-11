import { inflateSync } from "node:zlib";

export interface Pixels {
	readonly width: number;
	readonly height: number;
	readonly rgba: Uint8Array;
}

export type Colour = readonly [number, number, number];

const SIGNATURE_BYTES = 8;
const CHANNELS_OF_TYPE: Readonly<Record<number, number>> = { 2: 3, 6: 4 };

export function pixelsOfPng(png: Buffer): Pixels {
	const chunks = chunksOf(png);
	const header = chunks.get("IHDR")?.[0];
	if (!header) throw new Error("png: no IHDR chunk");
	const width = header.readUInt32BE(0);
	const height = header.readUInt32BE(4);
	const channels = CHANNELS_OF_TYPE[header[9] ?? -1];
	if (header[8] !== 8 || channels === undefined || header[12] !== 0)
		throw new Error("png: only 8-bit RGB or RGBA, not interlaced");
	const filtered = inflateSync(Buffer.concat(chunks.get("IDAT") ?? []));
	return { width, height, rgba: unfiltered(filtered, width, height, channels) };
}

function chunksOf(png: Buffer): Map<string, Buffer[]> {
	const chunks = new Map<string, Buffer[]>();
	for (let at = SIGNATURE_BYTES; at < png.length;) {
		const length = png.readUInt32BE(at);
		const type = png.toString("latin1", at + 4, at + 8);
		chunks.set(type, [...(chunks.get(type) ?? []), png.subarray(at + 8, at + 8 + length)]);
		at += length + 12;
	}
	return chunks;
}

function unfiltered(filtered: Buffer, width: number, height: number, channels: number): Uint8Array {
	const stride = width * channels;
	const lines = new Uint8Array(stride * height);
	for (let row = 0; row < height; row += 1) {
		const kind = filtered[row * (stride + 1)] ?? 0;
		for (let column = 0; column < stride; column += 1) {
			const raw = filtered[row * (stride + 1) + 1 + column] ?? 0;
			const left = column >= channels ? (lines[row * stride + column - channels] ?? 0) : 0;
			const up = row > 0 ? (lines[(row - 1) * stride + column] ?? 0) : 0;
			const upLeft = row > 0 && column >= channels ? (lines[(row - 1) * stride + column - channels] ?? 0) : 0;
			lines[row * stride + column] = (raw + predictorOf(kind, left, up, upLeft)) & 0xff;
		}
	}
	return channels === 4 ? lines : withAlpha(lines, width * height);
}

function predictorOf(kind: number, left: number, up: number, upLeft: number): number {
	if (kind === 1) return left;
	if (kind === 2) return up;
	if (kind === 3) return Math.floor((left + up) / 2);
	if (kind !== 4) return 0;
	const estimate = left + up - upLeft;
	const [toLeft, toUp, toUpLeft] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)];
	if (toLeft <= toUp && toLeft <= toUpLeft) return left;
	return toUp <= toUpLeft ? up : upLeft;
}

function withAlpha(rgb: Uint8Array, count: number): Uint8Array {
	const rgba = new Uint8Array(count * 4);
	for (let at = 0; at < count; at += 1) {
		rgba.set(rgb.subarray(at * 3, at * 3 + 3), at * 4);
		rgba[at * 4 + 3] = 255;
	}
	return rgba;
}
