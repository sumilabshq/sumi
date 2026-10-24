import type { SideLook } from "../../../shared/schema/frame-sides.schema.js";

const ALLOWED_TURNS: Readonly<Record<SideLook, readonly SideLook[]>> = {
	docked: ["hidden"],
	hidden: ["docked", "peeking"],
	peeking: ["hidden", "docked"],
};

export function toggledLook(look: SideLook): SideLook {
	return look === "docked" ? "hidden" : "docked";
}

export function peekedLook(look: SideLook): SideLook {
	return look === "hidden" ? "peeking" : look;
}

export function concealedLook(look: SideLook): SideLook {
	return look === "peeking" ? "hidden" : look;
}

export function refuseTurn(was: SideLook, next: SideLook): string | null {
	if (ALLOWED_TURNS[was].includes(next)) {
		return null;
	}

	return `cannot turn ${was} → ${next}`;
}
