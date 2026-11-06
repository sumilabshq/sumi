import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { countText } from "@widgetarium/core/engine/count-text.js";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { BusyMark } from "../busy-mark/busy-mark.js";
import { LineCounts } from "../tool-calls/line-counts.js";
import { changedLinesOf } from "../../lib/changed-lines.js";
import { liveSaidOf } from "../../lib/live-said.js";
import { saidSpent, saidWaiting } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";

export interface LiveHeadProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly session: AssistantSession;
	readonly tasks: number;
	readonly isOpen: boolean | undefined;
	readonly onPress: () => void;
}

const ONE_TASK = "1 task";
const MANY_TASKS = "{count} tasks";
const SEPARATOR = "·";

export function LiveHead({ calls, faces, session, tasks, isOpen, onPress }: LiveHeadProps): ReactElement {
	useTicking();
	const { done, now } = liveSaidOf(calls, faces, saidWaiting(session.phase));
	const changed = changedLinesOf(faces);
	const startedAt = calls[0]?.at ?? session.turns.at(-1)?.startedAt ?? Date.now();
	return (
		<button
			className="wg-studio-ai-tools-head is-live"
			type="button"
			aria-expanded={isOpen}
			onClick={onPress}
		>
			<BusyMark state={now === "" ? "thinking" : "working"} />
			<span className="wg-studio-ai-tools-said">
				{done}
				{now === "" ? null : <span className="wg-studio-ai-live-now">{now}</span>}
			</span>
			{changed === null ? null : <LineCounts added={changed.added} removed={changed.removed} />}
			<span className="wg-studio-ai-tools-took">
				{saidSpent({
					ms: Date.now() - startedAt,
					spent: session.spent,
				})}
			</span>
			{tasks === 0 ? null : <span className="wg-studio-ai-tools-took">{SEPARATOR}</span>}
			{tasks === 0 ? null : <span className="wg-studio-ai-live-tasks-count">{countText(tasks, ONE_TASK, MANY_TASKS)}</span>}
			{isOpen === undefined ? null : (
				<Icon
					name="chevron-right"
					size={12}
					className={isOpen ? "wg-studio-ai-tools-chevron is-open" : "wg-studio-ai-tools-chevron"}
				/>
			)}
		</button>
	);
}
