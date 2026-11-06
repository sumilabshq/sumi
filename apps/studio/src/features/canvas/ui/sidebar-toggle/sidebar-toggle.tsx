import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/framework";
import { SidebarQuery, ToggleSidebarCommand } from "@widgetarium/canvas";
import { SIDEBAR_LABEL } from "../../lib/sidebar-label.js";
import { RoundButton } from "../round-button/round-button.js";

export function SidebarToggle(): ReactElement {
	const { isOpen } = useQuery(SidebarQuery).data;
	const toggle = useCommand(ToggleSidebarCommand);
	return (
		<RoundButton
			label={SIDEBAR_LABEL}
			tone={isOpen ? "ink" : "raise"}
			size="l"
			aria-pressed={isOpen}
			disabled={!toggle.can}
			onClick={() => void toggle.run()}
			data-canvas-sidebar-toggle=""
		>
			<Icon name="panel-left" size={18} />
		</RoundButton>
	);
}
