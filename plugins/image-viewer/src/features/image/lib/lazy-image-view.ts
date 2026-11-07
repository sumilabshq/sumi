import { lazy } from "react";

export const LazyImageView = lazy(async () => ({
	default: (await import("../ui/image-view/image-view.js")).ImageView,
}));
