import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { useFlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { useFlowsSidebar } from "../../../../shared/lib/use-flows-sidebar.js";

const NEW_FLOW = "New flow";
const ICON_PX = 16;

export function NewFlowButton(): ReactElement {
	const sidebar = useFlowsSidebar();
	const acts = useFlowActs();
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			label={NEW_FLOW}
			{...tooltipMarks({ said: NEW_FLOW })}
			onClick={() => acts.create(NEW_FLOW, { folderId: null, before: sidebar.looseFlows[0]?.id ?? null })}
		>
			<Icon name="square-pen" size={ICON_PX} />
		</Button>
	);
}
