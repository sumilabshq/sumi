import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileBytesQuery } from "@sumi/contract";
import { FileNote, useOffersFileActions } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { imageSourceOf } from "../../lib/image-types.js";

export interface ImageFileProps {
	readonly tabId: string;
	readonly path: string;
}

export function ImageFile({ tabId, path }: ImageFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileBytesQuery, { path });
	useOffersFileActions({
		tabId,
		path,
		copied: () => path,
	});

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				boxSizing: "border-box",
				padding: "20px 32px 32px 40px",
				background: "var(--sumi-plate)",
			}}
		>
			<img
				alt={path.slice(path.lastIndexOf("/") + 1)}
				src={imageSourceOf(path, read.data)}
				style={{
					maxWidth: "100%",
					maxHeight: "100%",
					objectFit: "contain",
					borderRadius: "var(--sumi-r-lg)",
				}}
			/>
		</div>
	);
}
