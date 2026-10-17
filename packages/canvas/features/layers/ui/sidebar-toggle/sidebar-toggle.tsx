import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { SidebarQuery, ToggleSidebarCommand } from "../../contract.js";

const SIDEBAR_SAID = "Pages and layers";

export function SidebarToggle(): ReactElement {
	const { isOpen } = useQuery(SidebarQuery).data;
	const toggle = useCommand(ToggleSidebarCommand);
	return (
		<IconButton
			size="s"
			variant={isOpen ? "raised" : "ghost"}
			label={SIDEBAR_SAID}
			disabled={!toggle.can}
			onClick={() => void toggle.run()}
			data-canvas-sidebar-toggle=""
		>
			<Icon name="panel-left" size={16} />
		</IconButton>
	);
}
