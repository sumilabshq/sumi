import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantTurn, TurnOutcome } from "@widgetarium/core/engine/assistant-port.js";
import { CopyButton } from "./copy-button.js";
import { saidElapsed, turnSpanMs } from "./spent.js";

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
	return h("div", { className: `wg-studio-ai-finish is-${outcome}` }, [
		h("span", { className: "wg-studio-ai-finish-dot", key: "dot", "aria-hidden": true }),
		h("span", { className: "wg-studio-ai-finish-said", key: "said" }, endedSaid(turn, outcome)),
		isDone && turn.text !== "" ? h(CopyButton, { key: "copy", copy: () => copyText(turn.text) }) : null,
	]);
}

function endedSaid(turn: AssistantTurn, outcome: TurnOutcome): string {
	const spanMs = turnSpanMs(turn);
	const said = OUTCOME_SAID[outcome];
	return spanMs === null ? said : ENDED_IN.replace("{outcome}", said).replace("{took}", saidElapsed(spanMs));
}
