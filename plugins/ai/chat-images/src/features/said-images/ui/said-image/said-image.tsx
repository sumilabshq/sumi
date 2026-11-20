import { createElement as h } from "react";
import type { ReactElement } from "react";
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
			<span className="sumi-said-image is-failed">
				{NOT_SHOWN.replace("{name}", name).replace("{reason}", read.failure)}
			</span>
		);
	}

	if (read.data === null) {
		return <span className="sumi-said-image is-loading" />;
	}

	const src = imageSourceOf(path, read.data);
	return (
		<button
			type="button"
			className="sumi-said-image"
			aria-label={OPEN.replace("{name}", name)}
			{...pictureMarksOf({ src, name })}
		>
			<img src={src} alt={alt} />
		</button>
	);
}
