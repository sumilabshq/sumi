import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import { pictureMarksOf } from "@sumi/chat-plugin";
import { fileSystem } from "@sumi/contract";
import { imageSourceOf } from "@sumi/image-viewer-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface SaidImageProps {
	readonly path: string;
	readonly alt: string;
	readonly caption: string | null;
}

const NOT_SHOWN = "{name} is not shown: {reason}";
const OPEN = "Open {name}";

export function SaidImage({ path, alt, caption }: SaidImageProps): ReactElement {
	const read = useOptionalQuery(fileSystem.files.readBytes, { path });
	const name = caption ?? (alt === "" ? path.slice(path.lastIndexOf("/") + 1) : alt);

	if (read.failure !== null) {
		return (
			<span className="sumi-said-image-state is-failed">
				{NOT_SHOWN.replace("{name}", name).replace("{reason}", read.failure)}
			</span>
		);
	}

	if (read.data === null) {
		return <span className="sumi-said-image-state is-loading" />;
	}

	const src = imageSourceOf(path, read.data);
	return (
		<Pressable className="sumi-said-image" label={OPEN.replace("{name}", name)} {...pictureMarksOf({ src, name })}>
			<img src={src} alt={alt} />
		</Pressable>
	);
}
