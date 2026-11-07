import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FileNote, useFileTab } from "@sumi/files-plugin";
import { MarkdownFile } from "./markdown-file.js";

export interface MarkdownViewProps {
	readonly tabId: string;
}

const NO_FILE = "This tab names no Markdown file.";

export function MarkdownView({ tabId }: MarkdownViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);

	if (!isRead) {
		return null;
	}

	return path === null ? <FileNote said={NO_FILE} /> : <MarkdownFile tabId={tabId} path={path} />;
}
