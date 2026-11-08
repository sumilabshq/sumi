import { FilePathCopyAction, files, OpenInSystemAppAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { IMAGE_ICON } from "./features/image/lib/image-icon.js";
import { IMAGE_TYPES } from "./features/image/lib/image-types.js";
import { LazyImageView } from "./features/image/lib/lazy-image-view.js";
import { SizeAction } from "./features/image/ui/size-action/size-action.js";

export const imageViewer = plugin("image-viewer")
	.require(files)
	.apply((app) => {
		app.use(files).viewer({
			id: "image-viewer",
			title: "Image",
			icon: IMAGE_ICON,
			extensions: Object.keys(IMAGE_TYPES),
			view: LazyImageView,
			actions: [SizeAction, FilePathCopyAction, OpenInSystemAppAction],
		});
	});
