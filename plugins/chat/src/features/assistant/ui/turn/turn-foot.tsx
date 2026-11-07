import { createElement as h } from "react";
import type { ReactNode } from "react";
import type { AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";
import type { TurnStep } from "@widgetarium/assistant";
import { AnswerLine } from "./answer-line.js";
import { MineLine } from "./mine-line.js";

export interface TurnFootProps {
	readonly turn: AssistantTurn;
	readonly steps: readonly TurnStep[];
	readonly live: boolean;
}

export function TurnFoot({ turn, steps, live }: TurnFootProps): ReactNode {
	if (turn.role === "user") {
		return <MineLine sentAt={turn.startedAt ?? null} said={saidIn(steps)} />;
	}

	if (live) {
		return null;
	}

	return <AnswerLine answeredAt={answeredAtOf(turn)} said={saidIn(steps)} />;
}

function answeredAtOf({ endedAt, startedAt }: AssistantTurn): number | null {
	return endedAt ?? startedAt ?? null;
}

function saidIn(steps: readonly TurnStep[]): string {
	return steps.flatMap((step) => (step.kind === "said" ? [step.text] : [])).join("\n\n");
}
