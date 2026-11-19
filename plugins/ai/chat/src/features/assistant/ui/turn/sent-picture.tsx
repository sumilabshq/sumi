import { createElement as h } from "react";
import type { ReactElement } from "react";
import { pictureMarksOf } from "../../../../shared/lib/picture-marks.js";
import { GonePicture } from "./gone-picture.js";
import type { AttachmentChip } from "@widgetarium/assistant/contract";

export interface SentPictureProps {
	readonly picture: AttachmentChip;
}

const OPEN = "Open {name}";
const NAMED = "{name} · {size}";

export function SentPicture({ picture }: SentPictureProps): ReactElement {
	const named = NAMED.replace("{name}", picture.name).replace("{size}", picture.size);

	if (picture.preview === null) {
		return <GonePicture picture={picture} named={named} />;
	}

	return (
		<button
			type="button"
			className="wg-studio-ai-picture"
			aria-label={OPEN.replace("{name}", picture.name)}
			{...pictureMarksOf({ src: picture.preview, name: picture.name, size: picture.size })}
		>
			<img src={picture.preview} alt="" />
			<span className="wg-studio-ai-picture-name">{named}</span>
		</button>
	);
}
