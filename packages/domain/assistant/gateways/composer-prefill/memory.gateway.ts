import type { ComposerPrefill } from "../../shared/schema/composer-prefill.schema.js";
import { ComposerPrefillGateway } from "./composer-prefill.gateway.js";

export class MemoryComposerPrefillGateway extends ComposerPrefillGateway {
	private asked: ComposerPrefill | null = null;
	private lastId = 0;

	composerPrefill(): ComposerPrefill | null {
		return this.asked;
	}

	saveComposerPrefill(next: ComposerPrefill | null): void {
		this.asked = next;
		this.lastId = next?.id ?? this.lastId;
	}

	lastPrefillId(): number {
		return this.lastId;
	}
}
