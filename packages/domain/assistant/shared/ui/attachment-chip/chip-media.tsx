import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "../../schema/attachment.schema.js";

export interface ChipMediaProps {
	readonly chip: AttachmentChip;
	readonly onOpen?: (() => void) | undefined;
}

const OPEN = "Show {name} bigger";
const MEDIA = "cv:grid cv:size-7 cv:flex-none cv:place-items-center cv:overflow-hidden cv:rounded-full cv:bg-fill";
const OPENS = "cv:cursor-pointer cv:border-0 cv:p-0 cv:shadow-none";
const PICTURE = "cv:size-full cv:object-cover";

export function ChipMedia({ chip, onOpen }: ChipMediaProps): ReactElement {
	const opens = onOpen !== undefined && chip.preview !== null;
	const shown =
		chip.preview === null ? (
			<Icon name={chip.kind === "image" ? "image" : "file-text"} size={14} />
		) : (
			<img className={PICTURE} src={chip.preview} alt="" />
		);
	return h(
		opens ? "button" : "span",
		{
			type: opens ? "button" : undefined,
			className: opens ? `${MEDIA} ${OPENS}` : MEDIA,
			"aria-label": opens ? OPEN.replace("{name}", chip.name) : undefined,
			"aria-hidden": opens ? undefined : true,
			onClick: opens ? onOpen : undefined,
		},
		shown,
	);
}
