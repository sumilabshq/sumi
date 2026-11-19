import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOpensPressedPictures } from "../../lib/use-opens-pressed-pictures.js";
import { PictureViewer } from "../picture-viewer/picture-viewer.js";

export function PictureViewerLayer(): ReactElement | null {
	const { opened, close } = useOpensPressedPictures();

	if (opened === null) {
		return null;
	}

	return <PictureViewer pictures={opened.pictures} startAt={opened.startAt} host={opened.host} onClose={close} />;
}
