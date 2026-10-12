import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import { COMPONENTS_PAGE } from "../../schemas/canvas-page.schema.js";
import type { layersToggleInject } from "../../widgets/layers-toggle.widget.js";

const LAYERS_SAID = "Layers";

export function LayersToggle(props: InjectProps<typeof layersToggleInject>): ReactElement | null {
	const { pagesQuery, isLayersOpenQuery, toggleLayersCommand } = props;
	const pages = pagesQuery.data;
	if (!pages || pages.shown === COMPONENTS_PAGE) return null;
	return (
		<>
			<IconButton
				size="s"
				variant={isLayersOpenQuery.data ? "raised" : "ghost"}
				label={LAYERS_SAID}
				disabled={!toggleLayersCommand.can}
				onClick={() => void toggleLayersCommand.run()}
			>
				<Icon name="panel-left" size={16} />
			</IconButton>
		</>
	);
}
