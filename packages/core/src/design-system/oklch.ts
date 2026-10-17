import type { Rgba } from "../color-math.js";

export interface Oklch {
	readonly l: number;
	readonly c: number;
	readonly h: number;
	readonly alpha: number;
}

type Triple = readonly [number, number, number];

const DEGREES_PER_TURN = 360;
const RADIANS_PER_DEGREE = Math.PI / 180;
const ACHROMATIC_CHROMA = 0.000_02;

const OKLAB_TO_LMS: readonly Triple[] = [
	[1, 0.396_337_777_4, 0.215_803_757_3],
	[1, -0.105_561_345_8, -0.063_854_172_8],
	[1, -0.089_484_177_5, -1.291_485_548],
];

const LMS_TO_LINEAR_SRGB: readonly Triple[] = [
	[4.076_741_662_1, -3.307_711_591_3, 0.230_969_929_2],
	[-1.268_438_004_6, 2.609_757_401_1, -0.341_319_396_5],
	[-0.004_196_086_3, -0.703_418_614_7, 1.707_614_701],
];

const LINEAR_SRGB_TO_LMS: readonly Triple[] = [
	[0.412_221_470_8, 0.536_332_536_3, 0.051_445_992_9],
	[0.211_903_498_2, 0.680_699_545_1, 0.107_396_956_6],
	[0.088_302_461_9, 0.281_718_837_6, 0.629_978_700_5],
];

const LMS_TO_OKLAB: readonly Triple[] = [
	[0.210_454_255_3, 0.793_617_785, -0.004_072_046_8],
	[1.977_998_495_1, -2.428_592_205, 0.450_593_709_9],
	[0.025_904_037_1, 0.782_771_766_2, -0.808_675_766],
];

export function rgbaOfOklch({ l, c, h, alpha }: Oklch): Rgba {
	const radians = h * RADIANS_PER_DEGREE;
	const lms = timesMatrix(OKLAB_TO_LMS, [l, c * Math.cos(radians), c * Math.sin(radians)]).map((value) => value ** 3);
	const [r, g, b] = timesMatrix(LMS_TO_LINEAR_SRGB, [lms[0] ?? 0, lms[1] ?? 0, lms[2] ?? 0]).map(gammaEncoded);
	return {
		r: clampUnit(r ?? 0),
		g: clampUnit(g ?? 0),
		b: clampUnit(b ?? 0),
		a: alpha,
	};
}

export function oklchOfRgba({ r, g, b, a }: Rgba): Oklch {
	const lms = timesMatrix(LINEAR_SRGB_TO_LMS, [gammaDecoded(r), gammaDecoded(g), gammaDecoded(b)]).map(Math.cbrt);
	const [l = 0, labA = 0, labB = 0] = timesMatrix(LMS_TO_OKLAB, [lms[0] ?? 0, lms[1] ?? 0, lms[2] ?? 0]);
	const c = Math.hypot(labA, labB);
	const h =
		c < ACHROMATIC_CHROMA ? 0 : (Math.atan2(labB, labA) / RADIANS_PER_DEGREE + DEGREES_PER_TURN) % DEGREES_PER_TURN;
	return {
		l,
		c,
		h,
		alpha: a,
	};
}

function timesMatrix(matrix: readonly Triple[], vector: Triple): number[] {
	return matrix.map(([x, y, z]) => x * vector[0] + y * vector[1] + z * vector[2]);
}

function gammaEncoded(linear: number): number {
	const magnitude = Math.abs(linear);
	const encoded = magnitude <= 0.003_130_8 ? magnitude * 12.92 : 1.055 * magnitude ** (1 / 2.4) - 0.055;
	return Math.sign(linear) * encoded;
}

function gammaDecoded(encoded: number): number {
	return encoded <= 0.040_45 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
}

function clampUnit(value: number): number {
	return Math.min(1, Math.max(0, value));
}
