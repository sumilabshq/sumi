import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOpensPictures } from "../../lib/use-opens-pictures.js";
import { SentPicture } from "./sent-picture.js";
import type { AttachmentChip } from "@widgetarium/assistant";

export function SentPictures({ pictures }: { readonly pictures: readonly AttachmentChip[] }): ReactElement {
	const { holder, open, viewer } = useOpensPictures<HTMLDivElement>(pictures);
	return (
		<div className="wg-studio-ai-pictures" ref={holder} data-sent-pictures="">
			{pictures.map((picture) => (
				<SentPicture key={picture.id} picture={picture} onOpen={() => open(picture)} />
			))}
			{viewer}
		</div>
	);
}
