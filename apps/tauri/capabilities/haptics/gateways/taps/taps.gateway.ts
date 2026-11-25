import type { HapticPattern } from "../../shared/schema/haptics.schema.js";

export abstract class TapsGateway {
	abstract tap(pattern: HapticPattern): Promise<void>;
}
