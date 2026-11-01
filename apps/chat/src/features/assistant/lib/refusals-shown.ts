import { toastRefusal } from "@widgetarium/core/requests";
import type { CommandRefusal } from "@widgetarium/core/requests";
import { AttachFilesCommand, RemoveAttachmentCommand } from "@widgetarium/assistant";

const TOASTED: ReadonlySet<string> = new Set([AttachFilesCommand.name, RemoveAttachmentCommand.name]);

export function toastsAttachmentRefusals(refusal: CommandRefusal): void {
	if (!TOASTED.has(refusal.name)) {
		return;
	}

	toastRefusal(refusal);
}
