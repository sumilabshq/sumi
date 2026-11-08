import { FilePathCopyAction, files, OpenInSystemAppAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyVideoView } from "./features/video/lib/lazy-video-view.js";
import { VIDEO_ICON } from "./features/video/lib/video-icon.js";
import { VIDEO_TYPES } from "./features/video/lib/video-types.js";

export const videoViewer = plugin("video-viewer")
	.require(files)
	.apply((app) => {
		app.use(files).viewer({
			id: "video-viewer",
			title: "Video",
			icon: VIDEO_ICON,
			extensions: Object.keys(VIDEO_TYPES),
			view: LazyVideoView,
			actions: [FilePathCopyAction, OpenInSystemAppAction],
		});
	});
