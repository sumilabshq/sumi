import { FilePathCopyAction, FilesPlugin, FileViewersSlot, OpenInSystemAppAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyVideoView } from "./features/video/lib/lazy-video-view.js";
import { VIDEO_ICON } from "./features/video/lib/video-icon.js";
import { VIDEO_TYPES } from "./features/video/lib/video-types.js";

export const VideoViewerPlugin = plugin("video-viewer")
	.require(FilesPlugin)
	.fill(
		FileViewersSlot({
			id: "video-viewer",
			title: "Video",
			icon: VIDEO_ICON,
			extensions: Object.keys(VIDEO_TYPES),
			view: LazyVideoView,
			actions: [FilePathCopyAction, OpenInSystemAppAction],
		}),
	);
