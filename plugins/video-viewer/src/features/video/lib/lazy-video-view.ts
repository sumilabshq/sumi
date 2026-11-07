import { lazy } from "react";

export const LazyVideoView = lazy(async () => ({
	default: (await import("../ui/video-view/video-view.js")).VideoView,
}));
