import { createElement as h } from "react";
import type { ReactElement } from "react";
import { fileSystem } from "@sumi/contract";
import { imageSourceOf } from "@sumi/image-viewer-plugin";
import { linkOf } from "@widgetarium/core/engine/sumi-link.js";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface SaidImageProps {
	readonly path: string;
	readonly alt: string;
}

const NOT_SHOWN = "{name} is not shown: {reason}";
const FILE_APP = "file";

export function SaidImage({ path, alt }: SaidImageProps): ReactElement {
	const read = useOptionalQuery(fileSystem.files.readBytes, { path });
	const name = alt === "" ? path.slice(path.lastIndexOf("/") + 1) : alt;

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

	return (
		<a className="sumi-said-image" href={linkOf({ kind: "page", app: FILE_APP, address: path })} title={name}>
			<img src={imageSourceOf(path, read.data)} alt={alt} />
		</a>
	);
}
