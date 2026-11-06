import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { StepDots } from "./step-dots.js";

const NUMBER = "#{number}";
const WAITING = "Waiting for its turn";

export function TaskRow({ card }: { readonly card: TaskCard }): ReactElement {
	return (
		<div className="wg-studio-ai-call">
			<button className="wg-studio-ai-call-head" type="button" disabled={true}>
				<span className="wg-studio-ai-call-name">
					<span className="wg-studio-ai-call-verb">{NUMBER.replace("{number}", String(card.number))}</span>{" "}
					<span className="wg-studio-ai-call-object">{card.title}</span>{" "}
					<span className="wg-studio-ai-call-verb">{card.nextStep ?? WAITING}</span>
				</span>
				{card.steps.total === 0 ? null : <StepDots done={card.steps.done} total={card.steps.total} />}
			</button>
		</div>
	);
}
