import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface FailureAction {
	readonly said: string;
	readonly run: () => void;
}

export interface FailureCardProps {
	readonly title: string;
	readonly reason: string;
	readonly action: FailureAction;
}

export function FailureCard({ title, reason, action }: FailureCardProps): ReactElement {
	return h("div", { className: "wg-studio-ai-failure-card", role: "alert" }, [
		h("span", { className: "wg-studio-ai-failure-mark", key: "mark" }, h(Icon, { name: "circle-alert", size: 18 })),
		h("span", { className: "wg-studio-ai-failure-text", key: "text" }, [
			h("span", { className: "wg-studio-ai-failure-title", key: "title" }, title),
			h("span", { className: "wg-studio-ai-failure-reason", key: "reason" }, reason),
		]),
		h(
			"button",
			{ className: "wg-studio-ai-pill is-l", key: "action", type: "button", onClick: action.run },
			action.said,
		),
	]);
}
