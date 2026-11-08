import { toastRefusal } from "@widgetarium/data-framework";
import type { CommandRefusal } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant";

const TOASTED: ReadonlySet<string> = new Set([
	assistant.composer.attachFiles.name,
	assistant.composer.removeAttachment.name,
]);

export function toastsAttachmentRefusals(refusal: CommandRefusal): void {
	if (!TOASTED.has(refusal.name)) {
		return;
	}

	toastRefusal(refusal);
}
