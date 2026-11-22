import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { ChipMedia } from "./chip-media.js";
import type { AttachmentChip } from "@widgetarium/assistant/contract";

export interface AttachmentChipViewProps {
	readonly chip: AttachmentChip;
	readonly onOpen?: (() => void) | undefined;
	readonly onRemove?: (() => void) | undefined;
}

const REMOVE = "Remove {name}";
const PILL =
	"cv:inline-flex cv:h-9 cv:max-w-[240px] cv:min-w-0 cv:items-center cv:gap-2 cv:bg-raise cv:ps-1 cv:pe-3 cv:text-ink";
const WORDS = "cv:flex cv:min-w-0 cv:flex-col cv:leading-tight";
const NAME = "cv:truncate cv:text-sm";
const SIZE = "cv:text-xs cv:text-muted-foreground";
const REMOVES = "cv:-me-1.5 cv:flex-none";

export function AttachmentChipView({ chip, onOpen, onRemove }: AttachmentChipViewProps): ReactElement {
	return (
		<span className={PILL} data-attachment-chip={chip.kind}>
			<ChipMedia chip={chip} onOpen={onOpen} />
			<span className={WORDS}>
				<span className={NAME}>{chip.name}</span>
				<span className={SIZE}>{chip.size}</span>
			</span>
			{onRemove ? (
				<IconButton
					variant="ghost"
					size="xxs"
					className={REMOVES}
					label={REMOVE.replace("{name}", chip.name)}
					onClick={onRemove}
				>
					<Icon name="x" size={12} />
				</IconButton>
			) : null}
		</span>
	);
}
