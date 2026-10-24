import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "@widgetarium/assistant";

const GLYPH: Readonly<Record<AttachmentChip["kind"], string>> = {
	image: "image",
	text: "file-text",
	folder: "folder",
};

export function CardWords({ chip }: { readonly chip: AttachmentChip }): ReactElement {
	return (
		<>
			<span className="wg-studio-ai-card-glyph">
				<Icon name={GLYPH[chip.kind]} size={18} />
			</span>
			<span className="wg-studio-ai-card-words">
				<b>{chip.name}</b>
				<span>{chip.where ?? chip.size}</span>
			</span>
		</>
	);
}
