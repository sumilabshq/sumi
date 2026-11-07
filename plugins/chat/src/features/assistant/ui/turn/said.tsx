import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { MarkdownSaid } from "./markdown-said.js";
import { PlainSaid } from "./plain-said.js";

export interface SaidProps {
	readonly text: string;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

export function Said({ text, render, live }: SaidProps): ReactElement {
	if (!render) {
		return <PlainSaid text={text} />;
	}

	return <MarkdownSaid text={text} render={render} live={live} />;
}
