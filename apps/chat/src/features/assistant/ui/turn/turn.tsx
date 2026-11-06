import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { SentAttachments } from "./sent-attachments.js";
import { SentPictures } from "./sent-pictures.js";
import { TurnFoot } from "./turn-foot.js";
import { TurnSteps } from "./turn-steps.js";
import { isPicture } from "../../lib/use-opens-pictures.js";
import type { ShownTurn } from "@widgetarium/assistant";

export interface TurnProps {
	readonly shown: ShownTurn;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
	readonly hasLiveGroup?: boolean;
}

export function Turn({ shown, render, live, hasLiveGroup = false }: TurnProps): ReactElement {
	const { turn, attached } = shown;
	const isMine = turn.role === "user";
	const steps = hasLiveGroup ? shown.steps.slice(0, -1) : shown.steps;
	const pictures = attached.filter(isPicture);
	const files = attached.filter((chip) => !isPicture(chip));
	return (
		<div className={isMine ? "wg-studio-ai-turn is-mine" : "wg-studio-ai-turn is-answer"}>
			{pictures.length > 0 ? <SentPictures pictures={pictures} /> : null}
			<TurnSteps steps={steps} render={isMine ? null : render} isLastLive={live && !hasLiveGroup} />
			{files.length > 0 ? <SentAttachments attached={files} /> : null}
			<TurnFoot turn={turn} steps={steps} live={live} />
		</div>
	);
}
