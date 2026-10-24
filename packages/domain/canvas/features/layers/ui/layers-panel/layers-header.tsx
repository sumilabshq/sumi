import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { LayersPanelQuery } from "../../contract.js";
import { ToggleLayoutLockCommand } from "../../contract.js";
import { PanelHeader } from "../../../../shared/ui/side-panel/panel-header.js";

const TITLE = "Layers";
const LOCKED = "Layout locked: only widgets move";
const UNLOCKED = "Layout unlocked: groups move too";

export function LayersHeader(): ReactElement {
	const { isLocked } = useQuery(LayersPanelQuery).data;
	const toggleLock = useCommand(ToggleLayoutLockCommand);
	return (
		<PanelHeader title={TITLE}>
			<IconButton size="s" variant="ghost" label={isLocked ? LOCKED : UNLOCKED} onClick={() => void toggleLock.run()}>
				<Icon name={isLocked ? "lock" : "lock-open"} size={14} />
			</IconButton>
		</PanelHeader>
	);
}
