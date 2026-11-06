import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import type { TurnStep } from "@widgetarium/assistant";
import { StepView } from "./step-view.js";

export interface TurnStepsProps {
	readonly steps: readonly TurnStep[];
	readonly render: RenderMarkdown | null;
	readonly isLastLive: boolean;
}

export function TurnSteps({ steps, render, isLastLive }: TurnStepsProps): ReactElement {
	return (
		<Fragment>
			{steps.map((step, at) => (
				<StepView key={at} step={step} render={render} live={isLastLive && at === steps.length - 1} />
			))}
		</Fragment>
	);
}
