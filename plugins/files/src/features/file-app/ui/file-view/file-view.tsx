import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FileViewer } from "../../../../slots.js";
import { FileNote } from "../../../../shared/ui/file-note/file-note.js";
import { useFileTab } from "../../../../shared/lib/use-file-tab.js";
import { useViewerChoices } from "../../lib/use-viewer-choices.js";
import { viewerOfFile } from "../../lib/viewer-of-file.js";

export interface FileViewProps {
	readonly tabId: string;
	readonly viewers: readonly FileViewer[];
}

const NO_FILE = "This tab names no file. Open one with a sumi://file/<path> link.";

export function FileView({ tabId, viewers }: FileViewProps): ReactElement | null {
	const { path, isRead } = useFileTab(tabId);
	const choices = useViewerChoices();

	if (!isRead || choices === null) {
		return null;
	}

	if (path === null) {
		return <FileNote said={NO_FILE} />;
	}

	const { viewer, reason } = viewerOfFile(path, viewers, choices);

	if (viewer === null) {
		return <FileNote said={reason} />;
	}

	const View = viewer.view;
	return <View tabId={tabId} />;
}
