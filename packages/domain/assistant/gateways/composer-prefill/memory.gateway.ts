import type { ComposerPrefill } from "../../shared/schema/composer-prefill.schema.js";
import { ComposerPrefillGateway } from "./composer-prefill.gateway.js";

export class MemoryComposerPrefillGateway extends ComposerPrefillGateway {
	private asked: ComposerPrefill | null = null;

	composerPrefill(): ComposerPrefill | null {
		return this.asked;
	}

	saveComposerPrefill(next: ComposerPrefill): void {
		this.asked = next;
	}
}
