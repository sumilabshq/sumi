import { colorOf } from "../packages/core/src/color-math.js";

const COLOUR_FUNCTION = /(?:rgba?|oklch)\([^()]*\)|color\(srgb [^()]*\)/g;
const BYTE = 255;
const ALPHA_STEPS = 1000;

export function withColourBytes(value: unknown): unknown {
	if (typeof value === "string") {
		return value.replace(COLOUR_FUNCTION, bytesOf);
	}

	if (Array.isArray(value)) {
		return value.map(withColourBytes);
	}

	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(Object.entries(value).map(([key, held]) => [key, withColourBytes(held)]));
	}

	return value;
}

function bytesOf(colour: string): string {
	const rgba = colorOf(colour);
	if (rgba === null) {
		return colour;
	}

	const [r, g, b] = [rgba.r, rgba.g, rgba.b].map((channel) => Math.round(channel * BYTE));
	return `rgba(${r}, ${g}, ${b}, ${Math.round(rgba.a * ALPHA_STEPS) / ALPHA_STEPS})`;
}
