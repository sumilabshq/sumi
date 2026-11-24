import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantTurn, TurnOutcome } from "@widgetarium/core/engine/assistant-port.js";
import { saidElapsed, turnSpanMs } from "../../lib/spent.js";

export interface FinishLineProps {
	readonly turn: AssistantTurn;
	readonly outcome: TurnOutcome;
}

const OUTCOME_SAID: Readonly<Record<TurnOutcome, string>> = {
	done: "Worked for",
	stopped: "Stopped after",
	failed: "Failed after",
};
const OUTCOME_ALONE: Readonly<Record<TurnOutcome, string>> = {
	done: "Worked",
	stopped: "Stopped",
	failed: "Failed",
};
const ENDED_IN = "{outcome} {took}";

export function FinishLine({ turn, outcome }: FinishLineProps): ReactElement {
	return <div className={`wg-studio-ai-finish is-${outcome}`}>{endedSaid(turn, outcome)}</div>;
}

function endedSaid(turn: AssistantTurn, outcome: TurnOutcome): string {
	const spanMs = turnSpanMs(turn);
	return spanMs === null
		? OUTCOME_ALONE[outcome]
		: ENDED_IN.replace("{outcome}", OUTCOME_SAID[outcome]).replace("{took}", saidElapsed(spanMs));
}
