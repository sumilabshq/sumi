import type { Pin } from "../schema/pins.schema.js";

export interface PinsMove {
	readonly pins: readonly Pin[];
	readonly reason: string;
}

export function pinned(pins: readonly Pin[], pin: Pin): PinsMove | null {
	if (pins.some((one) => one.id === pin.id)) {
		return null;
	}

	return {
		pins: [...pins, pin],
		reason: `pins ${pins.length} → ${pins.length + 1} (pin ${pin.id}, ${pin.app} ${pin.address || "home"})`,
	};
}

export function unpinned(pins: readonly Pin[], id: string): PinsMove | null {
	if (!pins.some((one) => one.id === id)) {
		return null;
	}

	return {
		pins: pins.filter((one) => one.id !== id),
		reason: `pins ${pins.length} → ${pins.length - 1} (unpin ${id})`,
	};
}
