import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { ToolCalls } from "../tool-calls/tool-calls.js";
import { Said } from "./said.js";
import type { TurnStep } from "@widgetarium/assistant";

export interface StepViewProps {
	readonly step: TurnStep;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

export function StepView({ step, render, live }: StepViewProps): ReactElement {
	if (step.kind === "tools") {
		return <ToolCalls calls={step.calls} faces={step.faces} />;
	}

	return <Said text={step.text} render={render} live={live} />;
}
