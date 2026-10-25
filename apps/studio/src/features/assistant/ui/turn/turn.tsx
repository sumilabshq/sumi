import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { MineLine } from "./mine-line.js";
import { SentAttachments } from "./sent-attachments.js";
import { StepView } from "./step-view.js";
import type { ShownTurn, TurnStep } from "@widgetarium/assistant";

export interface TurnProps {
	readonly shown: ShownTurn;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

export function Turn({ shown, render, live }: TurnProps): ReactElement {
	const { turn, steps, attached } = shown;
	const isMine = turn.role === "user";
	return (
		<div className={isMine ? "wg-studio-ai-turn is-mine" : "wg-studio-ai-turn"}>
			{steps.map((step, at) => (
				<StepView key={at} step={step} render={isMine ? null : render} live={live && at === steps.length - 1} />
			))}
			{attached.length > 0 ? <SentAttachments attached={attached} /> : null}
			{isMine ? <MineLine sentAt={turn.startedAt ?? null} said={saidIn(steps)} /> : null}
		</div>
	);
}

function saidIn(steps: readonly TurnStep[]): string {
	return steps.flatMap((step) => (step.kind === "said" ? [step.text] : [])).join("\n\n");
}
