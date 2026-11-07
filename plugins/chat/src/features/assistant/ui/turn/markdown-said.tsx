import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { OPENED_LIVE_ATTRIBUTE } from "@widgetarium/markdown";
import { settledPart } from "../../lib/settled-part.js";
import { useLatchesTrue } from "../../lib/use-latches-true.js";
import { useRendersSettledMarkdown } from "../../lib/use-renders-settled-markdown.js";
import { useRunsCodeCommands } from "../../lib/use-runs-code-commands.js";
import { SaidTail } from "./said-tail.js";

export interface MarkdownSaidProps {
	readonly text: string;
	readonly render: RenderMarkdown;
	readonly live: boolean;
}

export function MarkdownSaid({ text, render, live }: MarkdownSaidProps): ReactElement {
	const { settled, tail } = live ? settledPart(text) : { settled: text, tail: "" };
	const wasLive = useLatchesTrue(live);
	const holder = useRendersSettledMarkdown(render, settled);
	useRunsCodeCommands(holder);
	return (
		<div className="wg-studio-ai-said is-markdown">
			<div ref={holder} {...{ [OPENED_LIVE_ATTRIBUTE]: wasLive ? "" : undefined }} />
			{tail === "" ? null : <SaidTail tail={tail} />}
		</div>
	);
}
