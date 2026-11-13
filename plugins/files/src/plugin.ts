import { apps } from "@sumi/apps-plugin";
import { filePage } from "@sumi/file-page/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { fileNameOf } from "./features/file-page/lib/file-name.js";
import type { FileViewer } from "./features/viewer-choice/lib/file-viewer.js";
import { fileLinkAppOf } from "./features/viewer-choice/lib/file-link-app.js";

export const files = plugin("files")
	.require(apps)
	.apply((app) => {
		const viewers: FileViewer[] = [];
		app.use(apps).app(fileLinkAppOf(viewers));
		return {
			viewer: (viewer: FileViewer): void => {
				viewers.push(viewer);
				app.use(apps).app({
					...viewer,
					tabModules: ({ tabId }) => [filePage({ tabId })],
					titleOf: fileNameOf,
				});
			},
		};
	});
