import type { HapticPattern } from "../../shared/schema/haptics.schema.js";
import { TapsGateway } from "./taps.gateway.js";

export class MemoryTapsGateway extends TapsGateway {
	readonly tapped: HapticPattern[] = [];

	override tap(pattern: HapticPattern): Promise<void> {
		this.tapped.push(pattern);
		return Promise.resolve();
	}
}
