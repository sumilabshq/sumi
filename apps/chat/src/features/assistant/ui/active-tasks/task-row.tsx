import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { StepDots } from "./step-dots.js";

const NUMBER = "#{number}";
const WAITING = "Waiting for its turn";

export function TaskRow({ card }: { readonly card: TaskCard }): ReactElement {
	return (
		<div className="wg-studio-ai-live-task">
			<span className="wg-studio-ai-live-task-number">{NUMBER.replace("{number}", String(card.number))}</span>
			<span className="wg-studio-ai-live-task-title">{card.title}</span>
			<span className="wg-studio-ai-live-task-step">{card.nextStep ?? WAITING}</span>
			{card.steps.total === 0 ? null : <StepDots done={card.steps.done} total={card.steps.total} />}
		</div>
	);
}
