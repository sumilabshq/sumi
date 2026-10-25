import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";
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
			<button
				type="button"
				className="wg-studio-ai-card-remove"
				aria-label={REMOVE_NAMED.replace("{name}", chip.name)}
				onClick={onRemove}
				{...tooltipMarks({ said: REMOVE, side: "top" })}
			>
				<Icon name="x" size={10} />
			</button>
		</span>
	);
}
