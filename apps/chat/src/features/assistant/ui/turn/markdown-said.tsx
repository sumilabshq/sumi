import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { settledPart } from "../../lib/settled-part.js";
import { useRendersSettledMarkdown } from "../../lib/use-renders-settled-markdown.js";

export interface MarkdownSaidProps {
	readonly text: string;
	readonly render: RenderMarkdown;
	readonly live: boolean;
}

export function MarkdownSaid({ text, render, live }: MarkdownSaidProps): ReactElement {
	const { settled, tail } = live ? settledPart(text) : { settled: text, tail: "" };
	const holder = useRendersSettledMarkdown(render, settled);
	return (
		<div className="wg-studio-ai-said is-markdown">
			<div ref={holder} />
			{tail === "" ? null : <div className="wg-studio-ai-tail">{tail}</div>}
		</div>
	);
}
