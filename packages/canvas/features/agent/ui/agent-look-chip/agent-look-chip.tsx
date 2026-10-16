import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { AgentLookQuery } from "../../contract.js";
import { ShowAgentPageCommand } from "../../contract.js";
import { fadedTurn } from "../../../../shared/lib/pages/faded-turn.js";

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
