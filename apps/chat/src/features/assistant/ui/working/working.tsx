import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { saidProgress } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";

export interface WorkingProps {
	readonly session: AssistantSession;
}

const STILL_BUILDING = "Still building — what you can see is not finished yet.";

export function Working({ session }: WorkingProps): ReactElement {
	useTicking();
	const startedAt = session.turns.at(-1)?.startedAt;
	const progress = saidProgress({
		ms: startedAt === undefined ? 0 : Date.now() - startedAt,
		spent: session.spent,
		phase: session.phase,
		tool: session.tool,
	});
	return (
		<div className="wg-studio-ai-busy">
			<Icon name="sparkle" size={14} className="wg-studio-ai-busy-mark" />
			<span className="wg-studio-ai-busy-said">{progress}</span>
			<span className="wg-studio-ai-busy-warn">{STILL_BUILDING}</span>
		</div>
	);
}
