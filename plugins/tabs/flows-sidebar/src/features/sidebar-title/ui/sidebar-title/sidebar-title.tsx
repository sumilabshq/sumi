import { createElement as h } from "react";
import type { ReactElement } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { NewFlowButton } from "./new-flow-button.js";

const HIDE_SIDEBAR = "Hide sidebar";
const SHOW_SIDEBAR = "Show sidebar";
const ICON_PX = 16;

export function SidebarTitle(): ReactElement {
	const look = useQuery(appHost.frameSides.frameSides).data.left;
	const toggle = useCommand(appHost.frameSides.toggle);
	const isDocked = look === "docked";
	const label = isDocked ? HIDE_SIDEBAR : SHOW_SIDEBAR;
	return (
		<div className="sumi-flows-title" data-title-floats={isDocked ? "beside" : "covering"}>
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={label}
				{...tooltipMarks({ said: label })}
				aria-expanded={isDocked}
				onClick={() => void toggle.run({ side: "left" })}
			>
				<Icon name="panel-left" size={ICON_PX} />
			</Button>
			<NewFlowButton />
		</div>
	);
}
