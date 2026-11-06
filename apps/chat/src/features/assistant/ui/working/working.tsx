import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { BusyMark } from "../busy-mark/busy-mark.js";
import { saidProgress } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";

export interface WorkingProps {
	readonly session: AssistantSession;
}

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
		<div className="wg-studio-ai-busy" aria-live="polite">
			<BusyMark state="thinking" />
			<span className="wg-studio-ai-busy-said">{progress}</span>
		</div>
	);
}
