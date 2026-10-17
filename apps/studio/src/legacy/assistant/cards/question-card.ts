import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppSpec } from "@widgetarium/core/app-spec.js";

export interface QuestionCardProps {
	readonly choice: AppSpec["choices"][number];
	readonly onPick: (picked: string) => void;
}

const QUESTION = "Question";
const PICKED = "Picked";

export function QuestionCard({ choice, onPick }: QuestionCardProps): ReactElement {
	return h("div", { className: "wg-studio-ai-question", role: "radiogroup", "aria-label": choice.name }, [
		h("span", { className: "wg-studio-ai-question-eyebrow", key: "eyebrow" }, QUESTION),
		h("span", { className: "wg-studio-ai-question-said", key: "said" }, choice.name),
		...choice.options.map((option) => optionPill(option, option === choice.picked, () => onPick(option))),
	]);
}

function optionPill(option: string, isPicked: boolean, onPick: () => void): ReactElement {
	const press = {
		key: option,
		type: "button",
		role: "radio",
		"aria-checked": isPicked,
		className: isPicked ? "wg-studio-ai-question-option is-picked" : "wg-studio-ai-question-option",
		onClick: isPicked ? undefined : onPick,
	};
	const mark = isPicked ? h("span", { className: "wg-studio-ai-question-mark", key: "mark" }, PICKED) : null;
	return h("button", press, [h("span", { key: "said" }, option), mark]);
}
