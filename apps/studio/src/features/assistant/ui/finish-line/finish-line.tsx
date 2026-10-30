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
const ENDED_IN = "{outcome} · {took}";

export function FinishLine({ turn, outcome }: FinishLineProps): ReactElement {
	return (
		<div className={`wg-studio-ai-finish is-${outcome}`}>
			<svg className="wg-studio-ai-finish-mark" viewBox="0 0 64 64" aria-hidden={true}>
				<circle cx="32" cy="32" r="32" />
				<path d="M18 34q6-8 12 0M34 34q6-8 12 0" />
			</svg>
			<span className="wg-studio-ai-finish-said">{endedSaid(turn, outcome)}</span>
		</div>
	);
}

function endedSaid(turn: AssistantTurn, outcome: TurnOutcome): string {
	const spanMs = turnSpanMs(turn);
	const said = OUTCOME_SAID[outcome];
	return spanMs === null ? said : ENDED_IN.replace("{outcome}", said).replace("{took}", saidElapsed(spanMs));
}
