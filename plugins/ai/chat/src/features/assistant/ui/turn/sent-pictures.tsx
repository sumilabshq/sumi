import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PICTURE_GROUP_MARKS } from "../../../../shared/lib/picture-marks.js";
import { SentPicture } from "./sent-picture.js";
import type { AttachmentChip } from "@widgetarium/assistant/contract";

export function SentPictures({ pictures }: { readonly pictures: readonly AttachmentChip[] }): ReactElement {
	return (
		<div className="wg-studio-ai-pictures" data-sent-pictures="" {...PICTURE_GROUP_MARKS}>
			{pictures.map((picture) => (
				<SentPicture key={picture.id} picture={picture} />
			))}
		</div>
	);
}
