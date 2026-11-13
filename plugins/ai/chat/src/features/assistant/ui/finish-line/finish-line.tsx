import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantTurn, TurnOutcome } from "@widgetarium/core/engine/assistant-port.js";
import { saidElapsed, turnSpanMs } from "../../lib/spent.js";

export interface FinishLineProps {
	readonly turn: AssistantTurn;
	readonly outcome: TurnOutcome;
}

const OUTCOME_SAID: Readonly<Record<TurnOutcome, string>> = {
	done: "Done",
	stopped: "Stopped",
	failed: "Failed",
};
const ENDED_IN = "{outcome} in {took}";

export function FinishLine({ turn, outcome }: FinishLineProps): ReactElement {
	return (
		<div className={`wg-studio-ai-finish is-${outcome}`}>
			<span className="wg-studio-ai-finish-mark" aria-hidden={true} />
			<span className="wg-studio-ai-finish-said">{endedSaid(turn, outcome)}</span>
		</div>
	);
}

function endedSaid(turn: AssistantTurn, outcome: TurnOutcome): string {
	const spanMs = turnSpanMs(turn);
	const said = OUTCOME_SAID[outcome];
	return spanMs === null ? said : ENDED_IN.replace("{outcome}", said).replace("{took}", saidElapsed(spanMs));
}
