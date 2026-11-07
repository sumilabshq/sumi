import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FileNote, useFileTab } from "@sumi/files-plugin";
import { HtmlFile } from "./html-file.js";

export interface HtmlViewProps {
	readonly tabId: string;
}

const NO_FILE = "This tab names no HTML page.";

export function HtmlView({ tabId }: HtmlViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);

	if (!isRead) {
		return null;
	}

	return path === null ? <FileNote said={NO_FILE} /> : <HtmlFile path={path} />;
}
