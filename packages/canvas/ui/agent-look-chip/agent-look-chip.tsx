import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/mediator";
import { AgentLookQuery } from "../../requests/agent/agent-look.js";
import { ShowAgentPageCommand } from "../../requests/agent/show-agent-page.js";
import { fadedTurn } from "../page-tabs/faded-turn.js";

const GO_THERE = "Go to the page the agent is looking at";

export function AgentLookChip(): ReactElement | null {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const { isShown, said, canGo } = useQuery(AgentLookQuery).data;
	const go = useCommand(ShowAgentPageCommand);
	if (!isShown) return null;
	return (
		<span ref={anchor} className="cv:inline-flex cv:items-center cv:gap-2">
			<Button
				size="s"
				variant="ghost"
				title={GO_THERE}
				onClick={canGo ? () => fadedTurn(anchor.current, () => void go.run()) : undefined}
			>
				<Icon name="sparkles" size={14} />
				{said}
			</Button>
		</span>
	);
}
