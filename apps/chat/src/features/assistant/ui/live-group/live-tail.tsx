import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { saidSpent } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";
import { LiveTasksCount } from "./live-tasks-count.js";

export interface LiveTailProps {
	readonly calls: readonly AssistantCall[];
	readonly session: AssistantSession;
	readonly tasks: number;
}

export function LiveTail({ calls, session, tasks }: LiveTailProps): ReactElement {
	useTicking();
	const spent = saidSpent({
		ms: Date.now() - liveStartOf(calls, session),
		spent: session.spent,
	});
	return (
		<Fragment>
			<span className="wg-studio-ai-tools-took">{spent}</span>
			{tasks === 0 ? null : <LiveTasksCount tasks={tasks} />}
		</Fragment>
	);
}

function liveStartOf(calls: readonly AssistantCall[], session: AssistantSession): number {
	return calls[0]?.at ?? session.turns.at(-1)?.startedAt ?? Date.now();
}
