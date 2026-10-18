import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "../../schema/attachment.schema.js";
import { ChipMedia } from "./chip-media.js";

export interface AttachmentChipViewProps {
	readonly chip: AttachmentChip;
	readonly onOpen?: (() => void) | undefined;
	readonly onRemove?: (() => void) | undefined;
}

const REMOVE = "Remove {name}";
const PILL =
	"cv:inline-flex cv:h-9 cv:max-w-[240px] cv:min-w-0 cv:items-center cv:gap-2 cv:rounded-full cv:bg-raise cv:ps-1 cv:pe-3 cv:text-ink";
const WORDS = "cv:flex cv:min-w-0 cv:flex-col cv:leading-tight";
const NAME = "cv:truncate cv:text-sm";
const SIZE = "cv:text-xs cv:text-muted-foreground";
const REMOVES =
	"cv:-me-1.5 cv:grid cv:size-6 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:text-muted-foreground cv:shadow-none cv:hover:bg-fill-hover";

export function AttachmentChipView({ chip, onOpen, onRemove }: AttachmentChipViewProps): ReactElement {
	return (
		<span className={PILL} data-attachment-chip={chip.kind}>
			<ChipMedia chip={chip} onOpen={onOpen} />
			<span className={WORDS}>
				<span className={NAME}>{chip.name}</span>
				<span className={SIZE}>{chip.size}</span>
			</span>
			{onRemove ? (
				<button type="button" className={REMOVES} aria-label={REMOVE.replace("{name}", chip.name)} onClick={onRemove}>
					<Icon name="x" size={12} />
				</button>
			) : null}
		</span>
	);
}
