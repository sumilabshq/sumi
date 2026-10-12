import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { PictureAsk } from "../../schemas/frame-picture.schema.js";
import type { framePicturesInject } from "../../widgets/frame-pictures.widget.js";
import { useBatched } from "../canvas-view/hooks/frames/use-batched.js";
import { FRAME_PICTURES } from "../canvas-view/field-contexts.js";
import type { FramePicturesKit } from "../canvas-view/field-contexts.js";

export function FramePictures(props: InjectProps<typeof framePicturesInject>): ReactElement {
	const { drawingQuery, framePicturesQuery, askForPicturesCommand, field: Field } = props;
	const ask = useBatched((asks: readonly PictureAsk[]) => void askForPicturesCommand.run({ asks: [...asks] }));
	const takesPictures = drawingQuery.data?.takesPictures === true;
	const shown = framePicturesQuery.data.shown;
	const pictures = useMemo<FramePicturesKit | null>(
		() => (takesPictures ? { shown, ask } : null),
		[takesPictures, shown, ask],
	);
	return (
		<FRAME_PICTURES.Provider value={pictures}>
			<Field />
		</FRAME_PICTURES.Provider>
	);
}
