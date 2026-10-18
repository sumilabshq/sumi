import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantTurn, TurnOutcome } from "@widgetarium/core/engine/assistant-port.js";
import { saidElapsed, turnSpanMs } from "../../lib/spent.js";
import { CopyButton } from "./copy-button.js";

export interface FinishLineProps {
	readonly turn: AssistantTurn;
	readonly outcome: TurnOutcome;
	readonly copyText: (text: string) => Promise<void>;
}

const OUTCOME_SAID: Readonly<Record<TurnOutcome, string>> = {
	done: "Done",
	stopped: "Stopped",
	failed: "Failed",
};
const ENDED_IN = "{outcome} · {took}";

export function FinishLine({ turn, outcome, copyText }: FinishLineProps): ReactElement {
	const isDone = outcome === "done";
	return (
		<div className={`wg-studio-ai-finish is-${outcome}`}>
			<span className="wg-studio-ai-finish-dot" aria-hidden={true} />
			<span className="wg-studio-ai-finish-said">{endedSaid(turn, outcome)}</span>
			{isDone && turn.text !== "" ? <CopyButton copy={() => copyText(turn.text)} /> : null}
		</div>
	);
}

function endedSaid(turn: AssistantTurn, outcome: TurnOutcome): string {
	const spanMs = turnSpanMs(turn);
	const said = OUTCOME_SAID[outcome];
	return spanMs === null ? said : ENDED_IN.replace("{outcome}", said).replace("{took}", saidElapsed(spanMs));
}
