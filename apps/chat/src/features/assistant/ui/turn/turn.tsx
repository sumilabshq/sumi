import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { AnswerLine } from "./answer-line.js";
import { MineLine } from "./mine-line.js";
import { SentAttachments } from "./sent-attachments.js";
import { SentPictures } from "./sent-pictures.js";
import { StepView } from "./step-view.js";
import { isPicture } from "../../lib/use-opens-pictures.js";
import type { ShownTurn, TurnStep } from "@widgetarium/assistant";

export interface TurnProps {
	readonly shown: ShownTurn;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
	readonly hasLiveGroup?: boolean;
}

export function Turn({ shown, render, live, hasLiveGroup = false }: TurnProps): ReactElement {
	const { turn, attached } = shown;
	const steps = hasLiveGroup ? shown.steps.slice(0, -1) : shown.steps;
	const isLastStepLive = live && !hasLiveGroup;
	const isMine = turn.role === "user";
	const pictures = attached.filter(isPicture);
	const files = attached.filter((chip) => !isPicture(chip));
	return (
		<div className={isMine ? "wg-studio-ai-turn is-mine" : "wg-studio-ai-turn is-answer"}>
			{pictures.length > 0 ? <SentPictures pictures={pictures} /> : null}
			{steps.map((step, at) => (
				<StepView key={at} step={step} render={isMine ? null : render} live={isLastStepLive && at === steps.length - 1} />
			))}
			{files.length > 0 ? <SentAttachments attached={files} /> : null}
			{isMine ? <MineLine sentAt={turn.startedAt ?? null} said={saidIn(steps)} /> : null}
			{isMine || live ? null : <AnswerLine answeredAt={turn.endedAt ?? turn.startedAt ?? null} said={saidIn(steps)} />}
		</div>
	);
}

function saidIn(steps: readonly TurnStep[]): string {
	return steps.flatMap((step) => (step.kind === "said" ? [step.text] : [])).join("\n\n");
}
