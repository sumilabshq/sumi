import type { AttachmentChip, AttachmentKind } from "@widgetarium/assistant";

export interface Carried {
	readonly kinds: readonly AttachmentKind[];
	readonly count: number;
}

const KINDS_IN_ORDER: readonly AttachmentKind[] = ["image", "text", "folder"];

export function carriedOf(chips: readonly AttachmentChip[]): Carried {
	return {
		kinds: KINDS_IN_ORDER.filter((kind) => chips.some((chip) => chip.kind === kind)),
		count: chips.length,
	};
}
