import type { AttachmentChip } from "@widgetarium/assistant/contract";

export function isPicture(chip: AttachmentChip): boolean {
	return chip.kind === "image";
}
