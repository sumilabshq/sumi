import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { agentLookInject } from "../../widgets/agent-look.widget.js";
import { fadedTurn } from "../page-tabs/faded-turn.js";
import { DesignLookChip } from "./design-look-chip.js";

const LOOKING_AT_PAGE = "Agent is looking at {where}";
const GO_THERE = "Go to the page the agent is looking at";

export function AgentLookChip({
	getAgentLook: look,
	showPage,
}: InjectProps<typeof agentLookInject>): ReactElement | null {
	const anchor = useRef<HTMLSpanElement | null>(null);
	if (!look) return null;
	if (!look.page) return <DesignLookChip />;
	const { page } = look;
	const where = look.frame ? `${page} · ${look.frame}` : page;
	return (
		<span ref={anchor} className="cv:inline-flex cv:items-center cv:gap-2">
			<Button
				size="s"
				variant="ghost"
				title={GO_THERE}
				onClick={() => fadedTurn(anchor.current, () => void showPage({ page }))}
			>
				<Icon name="sparkles" size={14} />
				{LOOKING_AT_PAGE.replace("{where}", where)}
			</Button>
		</span>
	);
}
