import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileBytesQuery } from "@sumi/contract";
import { FileNote, useFileSwitches, useRecordsFileTitle } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { imageSourceOf } from "../../lib/image-types.js";

export interface ImageFileProps {
	readonly tabId: string;
	readonly path: string;
}

export function ImageFile({ tabId, path }: ImageFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileBytesQuery, { path });
	const isActualSize = useFileSwitches().isOn("size");
	useRecordsFileTitle(tabId, path);

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
				alignItems: isActualSize ? "flex-start" : "center",
				justifyContent: isActualSize ? "flex-start" : "center",
				height: "100%",
				overflow: isActualSize ? "auto" : "hidden",
				boxSizing: "border-box",
				padding: "20px 32px 32px 40px",
				background: "var(--sumi-plate)",
			}}
		>
			<img
				alt={path.slice(path.lastIndexOf("/") + 1)}
				src={imageSourceOf(path, read.data)}
				style={{
					flex: "none",
					maxWidth: isActualSize ? "none" : "100%",
					maxHeight: isActualSize ? "none" : "100%",
					objectFit: "contain",
					borderRadius: "var(--sumi-r-lg)",
				}}
			/>
		</div>
	);
}
