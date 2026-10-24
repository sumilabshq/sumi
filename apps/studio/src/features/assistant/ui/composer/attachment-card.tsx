import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from "@widgetarium/kit";
import { CardWords } from "./card-words.js";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface AttachmentCardProps {
	readonly chip: AttachmentChip;
	readonly onRemove: () => void;
}

const REMOVE = "Remove";
const REMOVE_NAMED = "Remove {name}";

export function AttachmentCard({ chip, onRemove }: AttachmentCardProps): ReactElement {
	return (
		<span
			className={`wg-studio-ai-card is-${chip.preview === null ? "file" : "image"}`}
			data-attachment-card={chip.kind}
			tabIndex={0}
		>
			{chip.preview === null ? <CardWords chip={chip} /> : <img src={chip.preview} alt={chip.name} />}
			<Tooltip>
				<TooltipTrigger
					className="wg-studio-ai-card-remove"
					aria-label={REMOVE_NAMED.replace("{name}", chip.name)}
					onClick={onRemove}
				>
					<Icon name="x" size={11} />
				</TooltipTrigger>
				<TooltipContent className="wg-studio-ai-tip">{REMOVE}</TooltipContent>
			</Tooltip>
		</span>
	);
}
