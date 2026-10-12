import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import { GPU_SUPPLY } from "../render/gpu-supply.js";
import { choosePageRenderer, usePageRenderer } from "../local/page-renderer.js";
import type { PageRenderer } from "../local/page-renderer.js";

const RENDERERS: readonly { readonly value: PageRenderer; readonly label: string }[] = [
	{ value: "html", label: "HTML" },
	{ value: "gpu", label: "GPU" },
];

export function PageRendererToggle(): ReactElement | null {
	const renderer = usePageRenderer();
	if (useContext(GPU_SUPPLY) === null) return null;
	return h(Segmented<PageRenderer>, {
		items: RENDERERS,
		value: renderer,
		onValueChange: choosePageRenderer,
		size: "s",
		className: "wg-design-renderer",
	});
}
