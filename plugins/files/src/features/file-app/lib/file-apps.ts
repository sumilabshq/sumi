import { createElement } from "react";
import type { AppView, AppViewProps } from "@sumi/apps-plugin";
import type { FileViewer } from "../../../slots.js";
import { FileView } from "../ui/file-view/file-view.js";
import { FILE_ICON } from "./file-icon.js";

export interface FileApp {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly view: AppView;
}

const FILE_APP = "file";
const FILE_TITLE = "File";

export function fileAppsOf(viewers: readonly FileViewer[]): readonly FileApp[] {
	const resolving: FileApp = {
		id: FILE_APP,
		title: FILE_TITLE,
		icon: FILE_ICON,
		view: ({ tabId }: AppViewProps) => createElement(FileView, { tabId, viewers }),
	};
	return [resolving, ...viewers.map(({ id, title, icon, view }) => ({ id, title, icon, view }))];
}
