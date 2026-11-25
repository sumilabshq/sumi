import { NO_KEPT_FONTS } from "../../shared/schema/fonts.schema.js";
import type { FontRole, KeptFonts } from "../../shared/schema/fonts.schema.js";
import { memoryKept } from "../kept/kept.gateway.js";
import type { Kept } from "../kept/kept.gateway.js";

export class FontsGateway {
	constructor(private readonly kept: Kept<KeptFonts> = memoryKept(NO_KEPT_FONTS)) {}

	chosen(): KeptFonts {
		return this.kept.now();
	}

	saveChoice(role: FontRole, family: string | null, reason: string): void {
		this.kept.change({ ...this.kept.now(), [role]: family }, reason);
	}

	fontsChanged(listener: () => void): () => void {
		return this.kept.watch(listener);
	}
}
