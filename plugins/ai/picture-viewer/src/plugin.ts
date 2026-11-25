import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PictureViewerLayer } from "./features/picture-viewer/ui/picture-viewer-layer/picture-viewer-layer.js";
import metadata from "../metadata.json" with { type: "json" };

export const pictureViewer = plugin("picture-viewer")
	.describe(metadata)
	.require(shell)
	.apply((app) => {
		app.use(shell).layer(PictureViewerLayer);
	});
