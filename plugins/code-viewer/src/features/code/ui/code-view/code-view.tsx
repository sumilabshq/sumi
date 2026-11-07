import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FileNote, useFileTab } from "@sumi/files-plugin";
import { CodeFile } from "./code-file.js";

export interface CodeViewProps {
	readonly tabId: string;
}

const NO_FILE = "This tab names no file.";

export function CodeView({ tabId }: CodeViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);

	if (!isRead) {
		return null;
	}

	return path === null ? <FileNote said={NO_FILE} /> : <CodeFile path={path} />;
}
