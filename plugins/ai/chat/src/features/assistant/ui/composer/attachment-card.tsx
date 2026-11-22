import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, Pressable, tooltipMarks } from "@widgetarium/kit";
import { pictureMarksOf } from "../../../../shared/lib/picture-marks.js";
import { CardWords } from "./card-words.js";
import type { AttachmentChip } from "@widgetarium/assistant/contract";

export interface AttachmentCardProps {
	readonly chip: AttachmentChip;
	readonly onRemove: () => void;
}

const REMOVE = "Remove";
const REMOVE_NAMED = "Remove {name}";
const OPEN = "Open {name}";

export function AttachmentCard({ chip, onRemove }: AttachmentCardProps): ReactElement {
	return (
		<span
			className={`wg-studio-ai-card is-${chip.preview === null ? "file" : "image"}`}
			data-attachment-card={chip.kind}
			tabIndex={chip.preview === null ? 0 : undefined}
		>
			{chip.preview === null ? <CardWords chip={chip} /> : null}
			{chip.preview === null ? null : (
				<Pressable
					className="wg-studio-ai-card-open"
					label={OPEN.replace("{name}", chip.name)}
					{...pictureMarksOf({ src: chip.preview, name: chip.name, size: chip.size })}
				>
					<img src={chip.preview} alt="" />
				</Pressable>
			)}
			<IconButton
				variant="ghost"
				size="xxs"
				className="wg-studio-ai-card-remove"
				label={REMOVE_NAMED.replace("{name}", chip.name)}
				onClick={onRemove}
				{...tooltipMarks({ said: REMOVE, side: "top" })}
			>
				<Icon name="x" size={10} />
			</IconButton>
		</span>
	);
}
