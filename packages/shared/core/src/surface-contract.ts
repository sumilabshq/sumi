import { ROOT } from "./paths.js";

export const MEASURED_DIR = `${ROOT}/agent/measured`;

export const PRESET_TOKENS = {
	fill: "--group-fill",
	inset: "--group-inset",
} as const;

export function measuredPathOf(notePath: string): string {
	return `${MEASURED_DIR}/${notePath.replace(/[\\/]/g, "__")}.json`;
}
