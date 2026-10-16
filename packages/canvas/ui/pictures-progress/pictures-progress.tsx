import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Loader } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/mediator";
import { PicturesProgressQuery } from "../../requests/pictures-progress.query.js";

export function PicturesProgress(): ReactElement | null {
	const { isShown, said } = useQuery(PicturesProgressQuery).data;
	if (!isShown) return null;
	return <Loader label={said} />;
}
