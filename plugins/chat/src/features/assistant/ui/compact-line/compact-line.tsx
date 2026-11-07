import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantTurn, RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { Chevron } from "../chevron/chevron.js";
import { Said } from "../turn/said.js";
import { CompactEnded } from "./compact-ended.js";
import { CompactRunning } from "./compact-running.js";

export interface CompactLineProps {
	readonly turn: AssistantTurn;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

const COMPACTED = "Conversation compacted";
const NOT_COMPACTED = "Not compacted";

export function CompactLine({ turn, render, live }: CompactLineProps): ReactElement {
	const [isOpen, setOpen] = useState(false);

	if (live) {
		return <CompactRunning />;
	}

	if (turn.outcome !== "done" || turn.text === "") {
		return <CompactEnded said={turn.outcome === "done" ? COMPACTED : NOT_COMPACTED} />;
	}

	return (
		<div className={`wg-studio-ai-compact-block${isOpen ? " is-open" : ""}`}>
			<div className="wg-studio-ai-compact">
				<button
					type="button"
					className="wg-studio-ai-compact-said is-button"
					aria-expanded={isOpen}
					onClick={() => setOpen(!isOpen)}
				>
					<Icon name="fold-vertical" size={15} />
					{COMPACTED}
					<Chevron isOpen={isOpen} />
				</button>
			</div>
			{isOpen ? (
				<div className="wg-studio-ai-compact-summary">
					<Said text={turn.text} render={render} live={false} />
				</div>
			) : null}
		</div>
	);
}
