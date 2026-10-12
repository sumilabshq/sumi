import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { PictureAsk } from "../../schemas/frame-picture.schema.js";
import type { framePicturesInject } from "../../widgets/frame-pictures.widget.js";
import { useBatched } from "../canvas-view/hooks/frames/use-batched.js";
import { FRAME_PICTURES } from "../canvas-view/field-contexts.js";
import type { FramePicturesKit } from "../canvas-view/field-contexts.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";

const SAID_AT = "cv:absolute cv:bottom-16 cv:right-4 cv:z-[2] cv:rounded-xl cv:bg-page cv:px-2.5 cv:py-1.5";

export function FramePictures(props: InjectProps<typeof framePicturesInject>): ReactElement {
	const { getDrawing, getFramePictures, askForPictures, field: Field } = props;
	const pictured = useRefusal();
	const ask = useBatched((asks: readonly PictureAsk[]) => pictured.heard(askForPictures({ asks: [...asks] })));
	const takesPictures = getDrawing?.takesPictures === true;
	const pictures = useMemo<FramePicturesKit | null>(
		() => (takesPictures ? { shown: getFramePictures.shown, ask } : null),
		[takesPictures, getFramePictures, ask],
	);
	return (
		<FRAME_PICTURES.Provider value={pictures}>
			<Field />
			<SaidLine said={pictured.refusal} className={SAID_AT} />
		</FRAME_PICTURES.Provider>
	);
}
