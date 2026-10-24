import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import "./unopened-screen.css";

export interface UnopenedScreenProps {
	readonly failure: string;
	readonly onRetry: () => void;
}

export function UnopenedScreen({ failure, onRetry }: UnopenedScreenProps): ReactElement {
	return h(
		"main",
		{ className: "wg-root ink-unopened" },
		h(
			"section",
			{ className: "ink-unopened-card" },
			h("h1", { className: "ink-unopened-title" }, "The workspace did not open"),
			h("p", { className: "ink-unopened-text", role: "alert" }, failure),
			h(Button, { size: "lg", onClick: onRetry }, "Try again"),
		),
	);
}
