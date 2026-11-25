import type { ModuleFacts } from "@widgetarium/data-framework";
import { MemoryTapsGateway } from "../taps/memory.gateway.js";
import type { TapsGateway } from "../taps/taps.gateway.js";
import { TauriTapsGateway } from "../taps/tauri.gateway.js";

export type HapticsParts = {
	readonly taps: TapsGateway;
};

const HAPTICS_HOST = "HAPTICS_HOST";
const TAURI_HAPTICS = "tauri";

export function hapticsPartsOn({ env }: ModuleFacts): HapticsParts {
	return { taps: env[HAPTICS_HOST] === TAURI_HAPTICS ? new TauriTapsGateway() : new MemoryTapsGateway() };
}
