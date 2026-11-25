import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { NEW_SESSION, newSessionPlaceOf } from "../../../../shared/lib/flow-facts.js";
import { useFlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { useFlowsSidebar } from "../../../../shared/lib/use-flows-sidebar.js";

const ICON_PX = 16;

export function NewFlowButton(): ReactElement {
	const sidebar = useFlowsSidebar();
	const acts = useFlowActs();
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			label={NEW_SESSION}
			{...tooltipMarks({ said: NEW_SESSION })}
			onClick={() => acts.create(NEW_SESSION, newSessionPlaceOf(sidebar, sidebar.windowProjectId))}
		>
			<Icon name="square-pen" size={ICON_PX} />
		</Button>
	);
}
