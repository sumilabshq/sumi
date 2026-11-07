import type { ComposerPrefill } from "../../shared/schema/composer-prefill.schema.js";

export abstract class ComposerPrefillGateway {
	abstract composerPrefill(): ComposerPrefill | null;
	abstract saveComposerPrefill(next: ComposerPrefill | null): void;
	abstract lastPrefillId(): number;
}
