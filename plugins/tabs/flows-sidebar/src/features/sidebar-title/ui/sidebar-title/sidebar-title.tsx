import { createElement as h } from "react";
import type { ReactElement } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { layout } from "@widgetarium/layout/contract";
import { useTitleReach } from "../../lib/use-title-reach.js";
import { NewFlowButton } from "./new-flow-button.js";
import { TrailKeys } from "./trail-keys.js";

const HIDE_SIDEBAR = "Hide sidebar";
const SHOW_SIDEBAR = "Show sidebar";
const ICON_PX = 16;

export function SidebarTitle(): ReactElement {
	const look = useQuery(appHost.frameSides.frameSides).data.left;
	const sidebarPx = useQuery(layout.frameWidths.frameWidths).data.left;
	const toggle = useCommand(appHost.frameSides.toggle);
	const isDocked = look === "docked";
	const label = isDocked ? HIDE_SIDEBAR : SHOW_SIDEBAR;
	const reach = useTitleReach(isDocked ? sidebarPx : null);
	return (
		<div
			ref={reach.ref}
			className="sumi-flows-title"
			data-title-floats={isDocked ? "beside" : "covering"}
			data-docked={isDocked ? "" : undefined}
			style={{ width: reach.widthPx }}
		>
			<Button
				shape="square"
				emphasis="ghost"
				label={label}
				{...tooltipMarks({ said: label })}
				aria-expanded={isDocked}
				onClick={() => void toggle.run({ side: "left" })}
			>
				<Icon name="panel-left" size={ICON_PX} />
			</Button>
			<div className="sumi-flows-title-acts">
				<NewFlowButton />
				<TrailKeys />
			</div>
		</div>
	);
}
