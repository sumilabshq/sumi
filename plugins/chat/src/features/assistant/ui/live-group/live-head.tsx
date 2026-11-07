import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { BusyMark } from "../busy-mark/busy-mark.js";
import { LineCounts } from "../tool-calls/line-counts.js";
import { changedLinesOf } from "../../lib/changed-lines.js";
import { liveSaidOf } from "../../lib/live-said.js";
import { saidWaiting } from "../../lib/spent.js";
import { LiveTail } from "./live-tail.js";

export interface LiveHeadProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly session: AssistantSession;
	readonly tasks: number;
	readonly isOpen: boolean | undefined;
	readonly onPress: () => void;
}

export function LiveHead({ calls, faces, session, tasks, isOpen, onPress }: LiveHeadProps): ReactElement {
	const { done, now } = liveSaidOf(calls, faces, saidWaiting(session.phase));
	const changed = changedLinesOf(faces);
	return (
		<button className="wg-studio-ai-tools-head is-live" type="button" aria-expanded={isOpen} onClick={onPress}>
			<BusyMark state={now === "" ? "thinking" : "working"} />
			<span className="wg-studio-ai-tools-said">
				{done}
				{now === "" ? null : <span className="wg-studio-ai-live-now">{now}</span>}
			</span>
			{changed === null ? null : <LineCounts added={changed.added} removed={changed.removed} />}
			<LiveTail calls={calls} session={session} tasks={tasks} />
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
