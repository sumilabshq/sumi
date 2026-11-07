import { toastRefusal } from "@widgetarium/data-framework";
import type { CommandRefusal } from "@widgetarium/data-framework";
import { AttachFilesCommand, RemoveAttachmentCommand } from "@widgetarium/assistant";

const TOASTED: ReadonlySet<string> = new Set([AttachFilesCommand.name, RemoveAttachmentCommand.name]);

export function toastsAttachmentRefusals(refusal: CommandRefusal): void {
	if (!TOASTED.has(refusal.name)) {
		return;
	}

	toastRefusal(refusal);
}
