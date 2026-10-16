import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ChooseRendererCommand } from "../../contract.js";
import { RendererSwitchQuery } from "../../contract.js";
import type { PageRenderer } from "../../../../shared/schema/canvas-view.schema.js";

const RENDERERS: readonly { readonly value: PageRenderer; readonly label: string }[] = [
	{ value: "html", label: "HTML" },
	{ value: "gpu", label: "GPU" },
];

export function RendererSwitch(): ReactElement | null {
	const { isShown, renderer } = useQuery(RendererSwitchQuery).data;
	const choose = useCommand(ChooseRendererCommand);
	if (!isShown) return null;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-2" data-canvas-renderer="">
			<Segmented<PageRenderer>
				items={RENDERERS}
				value={renderer}
				onValueChange={(picked) => void choose.run({ renderer: picked })}
				size="s"
			/>
		</span>
	);
}
