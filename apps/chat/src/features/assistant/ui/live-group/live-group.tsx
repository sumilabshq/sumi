import { Fragment, createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useMessageScroller } from "@widgetarium/kit";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { Fold } from "../fold/fold.js";
import { CallRows } from "../tool-calls/call-rows.js";
import { TaskRow } from "../active-tasks/task-row.js";
import { useChatTasks } from "../../lib/use-chat-tasks.js";
import { useIsStuckBelow } from "../../lib/use-is-stuck-below.js";
import { useRemembersGroupOpen } from "../../lib/use-remembers-group-open.js";
import { LiveHead } from "./live-head.js";

export interface LiveGroupProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly session: AssistantSession;
	readonly chatId?: string | undefined;
}

export function LiveGroup({ calls, faces, session, chatId }: LiveGroupProps): ReactElement {
	const end = useRef<HTMLDivElement | null>(null);
	const isStuck = useIsStuckBelow(end);
	const [isOpen, setOpen] = useRemembersGroupOpen(calls[0]?.ref);
	const { scrollToEnd } = useMessageScroller();
	const tasks = useChatTasks(chatId);
	const canOpen = calls.length > 0 || tasks.length > 0;
	const isShownOpen = canOpen && isOpen && !isStuck;
	const press = (): void => {
		if (isStuck) {
			setOpen(canOpen);
			scrollToEnd();
			return;
		}

		setOpen(!isOpen);
	};
	return (
		<Fragment>
			<div className={isStuck ? "wg-studio-ai-live is-stuck" : "wg-studio-ai-live"}>
				<LiveHead
					calls={calls}
					faces={faces}
					session={session}
					tasks={tasks.length}
					isOpen={canOpen ? isShownOpen : undefined}
					onPress={press}
				/>
				<Fold isOpen={isShownOpen}>
					<CallRows calls={calls} faces={faces}>
						{tasks.map((card) => (
							<TaskRow key={card.id} card={card} />
						))}
					</CallRows>
				</Fold>
			</div>
			<div className="wg-studio-ai-live-end" ref={end} aria-hidden="true" />
		</Fragment>
	);
}
