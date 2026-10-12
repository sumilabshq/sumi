import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Loader } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { picturesProgressInject } from "../../widgets/pictures-progress.widget.js";

const PREPARING = "Preparing pictures · {count}";

export function PicturesProgress({
	framePicturesQuery: { data: pictures },
}: InjectProps<typeof picturesProgressInject>): ReactElement | null {
	if (pictures.waiting === 0) return null;
	return <Loader label={PREPARING.replace("{count}", String(pictures.waiting))} />;
}
