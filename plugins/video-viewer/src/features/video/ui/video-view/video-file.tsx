import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileBytesQuery } from "@sumi/contract";
import { FileNote } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { videoSourceOf } from "../../lib/video-types.js";

export interface VideoFileProps {
	readonly path: string;
}

export function VideoFile({ path }: VideoFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileBytesQuery, { path });

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
			<video
				controls
				src={videoSourceOf(path, read.data)}
				style={{
					maxWidth: "100%",
					maxHeight: "100%",
					borderRadius: "var(--sumi-r-lg)",
				}}
			/>
		</div>
	);
}
