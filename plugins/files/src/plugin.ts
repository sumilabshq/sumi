import { apps } from "@sumi/apps-plugin";
import { filePage } from "@sumi/file-page/implementation";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { fileNameOf } from "./features/file-page/lib/file-name.js";
import { fileViewers } from "./slots.js";

export const files = plugin("files")
	.require(sumiHost, apps)
	.declare(fileViewers)
	.fill(
		apps.apps.addFrom(fileViewers, (viewers) =>
			viewers.map(({ id, title, icon, view, actions }) => ({
				id,
				title,
				icon,
				view,
				actions,
				tabModules: ({ tabId }) => [filePage({ tabId })],
				titleOf: fileNameOf,
			})),
		),
	);
