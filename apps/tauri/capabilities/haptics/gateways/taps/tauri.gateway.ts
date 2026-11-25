import { invoke } from "@tauri-apps/api/core";
import type { HapticPattern } from "../../shared/schema/haptics.schema.js";
import { TapsGateway } from "./taps.gateway.js";

const TAP = "plugin:haptics|tap";

export class TauriTapsGateway extends TapsGateway {
	override async tap(pattern: HapticPattern): Promise<void> {
		await invoke(TAP, { pattern });
	}
}
