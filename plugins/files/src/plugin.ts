import { apps } from "@sumi/apps-plugin";
import { filePage } from "@sumi/file-page/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { fileNameOf } from "./features/file-page/lib/file-name.js";
import type { FileViewer } from "./features/viewer-choice/lib/file-viewer.js";

export const files = plugin("files")
	.require(apps)
	.apply((app) => ({
		viewer: ({ id, title, icon, view, actions }: FileViewer): void => {
			app.use(apps).app({
				id,
				title,
				icon,
				view,
				actions,
				tabModules: ({ tabId }) => [filePage({ tabId })],
				titleOf: fileNameOf,
			});
		},
	}));
