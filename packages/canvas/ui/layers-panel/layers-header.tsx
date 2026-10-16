import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { LayersPanelQuery } from "../../features/layers/contract.js";
import { ToggleLayoutLockCommand } from "../../features/layers/contract.js";

const TITLE = "Layers";
const LOCKED = "Layout locked: only widgets move";
const UNLOCKED = "Layout unlocked: groups move too";

export function LayersHeader(): ReactElement {
	const { isLocked } = useQuery(LayersPanelQuery).data;
	const toggleLock = useCommand(ToggleLayoutLockCommand);
	return (
		<header className="cv:flex cv:items-center cv:justify-between cv:px-1.5 cv:pb-1.5 cv:text-base cv:text-muted-foreground">
			<b>{TITLE}</b>
			<IconButton size="s" variant="ghost" label={isLocked ? LOCKED : UNLOCKED} onClick={() => void toggleLock.run()}>
				<Icon name={isLocked ? "lock" : "lock-open"} size={14} />
			</IconButton>
		</header>
	);
}
