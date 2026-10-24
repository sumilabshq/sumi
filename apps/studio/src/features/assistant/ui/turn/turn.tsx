import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { ToolCalls } from "../tool-calls/tool-calls.js";
import { Said } from "./said.js";
import { SentAttachments } from "./sent-attachments.js";
import type { ShownTurn } from "@widgetarium/assistant";

export interface TurnProps {
	readonly shown: ShownTurn;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

export function Turn({ shown, render, live }: TurnProps): ReactElement {
	const { turn, said, faces, attached } = shown;
	const isMine = turn.role === "user";
	return (
		<div className={isMine ? "wg-studio-ai-turn is-mine" : "wg-studio-ai-turn"}>
			{turn.calls.length > 0 ? <ToolCalls calls={turn.calls} faces={faces} /> : null}
			{said === "" ? null : <Said text={said} render={isMine ? null : render} live={live} />}
			{attached.length > 0 ? <SentAttachments attached={attached} /> : null}
		</div>
	);
}
