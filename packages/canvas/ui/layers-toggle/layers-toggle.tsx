import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import { COMPONENTS_PAGE } from "../../schemas/canvas-page.schema.js";
import type { layersToggleInject } from "../../widgets/layers-toggle.widget.js";

const LAYERS_SAID = "Layers";

export function LayersToggle(props: InjectProps<typeof layersToggleInject>): ReactElement | null {
	const { getPages: pages, getIsLayersOpen: isOpen, toggleLayers } = props;
	if (!pages || pages.shown === COMPONENTS_PAGE) return null;
	return (
		<>
			<IconButton
				size="s"
				variant={isOpen ? "raised" : "ghost"}
				label={LAYERS_SAID}
				onClick={() => void toggleLayers()}
			>
				<Icon name="panel-left" size={16} />
			</IconButton>
		</>
	);
}
