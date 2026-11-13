import type { FilledApp } from "@sumi/apps-plugin";
import type { FileViewer } from "./file-viewer.js";
import { viewerOfFile } from "./viewer-of-file.js";

const FILE_LINK_APP_ID = "file";
const FILE_LINK_TITLE = "File";
const NO_VIEWER_CHOICES = {};
const FILE_LINK_GUIDE =
	"sumi://file/<absolute path> opens a file in the viewer for its type. Example: [plan.md](sumi://file//Users/me/repo/docs/plan.md).";

export function fileLinkAppOf(viewers: readonly FileViewer[]): FilledApp {
	return {
		id: FILE_LINK_APP_ID,
		title: FILE_LINK_TITLE,
		isListed: false,
		tabs: {
			runsInPage: false,
		},
		linkGuide: FILE_LINK_GUIDE,
		// TODO: pass the file-viewers.json choices once something reads them.
		handoffAppOf: (path) => viewerOfFile(path, viewers, NO_VIEWER_CHOICES).viewer?.id ?? null,
	};
}
