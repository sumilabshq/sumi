import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "@widgetarium/assistant";

export function GonePicture({
	picture,
	named,
}: {
	readonly picture: AttachmentChip;
	readonly named: string;
}): ReactElement {
	return (
		<span className="wg-studio-ai-picture is-gone" title={named}>
			<Icon name="image" size={20} />
			<span className="wg-studio-ai-picture-said">{picture.name}</span>
		</span>
	);
}
