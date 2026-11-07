import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FileNote, useFileTab } from "@sumi/files-plugin";
import { ImageFile } from "./image-file.js";

export interface ImageViewProps {
	readonly tabId: string;
}

const NO_FILE = "This tab names no image.";

export function ImageView({ tabId }: ImageViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);

	if (!isRead) {
		return null;
	}

	return path === null ? <FileNote said={NO_FILE} /> : <ImageFile tabId={tabId} path={path} />;
}
