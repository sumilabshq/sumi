import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { PageRenderer } from "../../schemas/canvas-view.schema.js";
import type { rendererSwitchInject } from "../../widgets/renderer-switch.widget.js";

const RENDERERS: readonly { readonly value: PageRenderer; readonly label: string }[] = [
	{ value: "html", label: "HTML" },
	{ value: "gpu", label: "GPU" },
];

export function RendererSwitch(props: InjectProps<typeof rendererSwitchInject>): ReactElement | null {
	const { rendererQuery, chooseRendererCommand } = props;
	if (!props.drawingQuery.data?.gpu) return null;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-2" data-canvas-renderer="">
			<Segmented<PageRenderer>
				items={RENDERERS}
				value={rendererQuery.data}
				onValueChange={(renderer) => void chooseRendererCommand.run({ renderer })}
				size="s"
			/>
		</span>
	);
}
