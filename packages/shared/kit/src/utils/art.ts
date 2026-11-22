import { ART_TONES } from "../constants/art";
import type { BadgeColor } from "../constants/tones";
import type { TokenStyle } from "./token-style";

export function toneOfIndex(index: number): BadgeColor {
	return ART_TONES[((index % ART_TONES.length) + ART_TONES.length) % ART_TONES.length] ?? "purple";
}

export function artInksOf(tones: readonly BadgeColor[] | undefined, size: number): TokenStyle {
	const first = tones?.[0] ?? "purple";
	const second = tones?.[1] ?? first;
	return {
		"--art-a": `var(--${first})`,
		"--art-b": `var(--${second})`,
		"--art-size": `${size}px`,
	};
}
