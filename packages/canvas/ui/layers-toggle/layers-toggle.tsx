import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { LayersToggleQuery } from "../../features/layers/contract.js";
import { ToggleLayersCommand } from "../../features/layers/contract.js";

const LAYERS_SAID = "Layers";

export function LayersToggle(): ReactElement | null {
	const { isShown, isOpen } = useQuery(LayersToggleQuery).data;
	const toggle = useCommand(ToggleLayersCommand);
	if (!isShown) return null;
	return (
		<IconButton
			size="s"
			variant={isOpen ? "raised" : "ghost"}
			label={LAYERS_SAID}
			disabled={!toggle.can}
			onClick={() => void toggle.run()}
		>
			<Icon name="panel-left" size={16} />
		</IconButton>
	);
}
