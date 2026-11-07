import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { FilePageModule } from "@sumi/file-page/module";
import { SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FileViewersSlot } from "./slots.js";

export const FilesPlugin = plugin("files")
	.require(SumiHostPlugin, AppsPlugin)
	.declare(FileViewersSlot)
	.fill(
		AppsSlot(FileViewersSlot, (viewers) =>
			viewers.map(({ id, title, icon, view, actions }) => ({
				id,
				title,
				icon,
				view,
				actions,
				tabModules: () => [FilePageModule],
			})),
		),
	);
