import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FileNote, useFileTab } from "@sumi/files-plugin";
import { VideoFile } from "./video-file.js";

export interface VideoViewProps {
	readonly tabId: string;
}

const NO_FILE = "This tab names no video.";

export function VideoView({ tabId }: VideoViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);

	if (!isRead) {
		return null;
	}

	return path === null ? <FileNote said={NO_FILE} /> : <VideoFile tabId={tabId} path={path} />;
}
