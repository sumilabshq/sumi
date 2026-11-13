import { Fragment, createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useMessageScroller } from "@widgetarium/kit";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { Fold } from "../fold/fold.js";
import { CallRows } from "../tool-calls/call-rows.js";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { useIsStuckBelow } from "../../lib/use-is-stuck-below.js";
import { useRemembersGroupOpen } from "../../lib/use-remembers-group-open.js";
import { LiveHead } from "./live-head.js";

export interface LiveGroupProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly session: AssistantSession;
	readonly chatId?: string | undefined;
}

interface LiveSlots {
	readonly tail: ReactElement | null;
	readonly rows: ReactElement | null;
}

export function LiveGroup({ calls, faces, session, chatId }: LiveGroupProps): ReactElement {
	const end = useRef<HTMLDivElement | null>(null);
	const isStuck = useIsStuckBelow(end);
	const [isOpen, setOpen] = useRemembersGroupOpen(calls[0]?.ref);
	const { scrollToEnd } = useMessageScroller();
	// TRADE-OFF: a fill reports its rows through a prop, so a second fill of chat.live-tail overwrites the first's count
	const [slotRows, setSlotRows] = useState(0);
	const { tail, rows } = liveSlotsOf(chatId, setSlotRows);
	const canOpen = calls.length > 0 || slotRows > 0;
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
					tail={tail}
					isOpen={canOpen ? isShownOpen : undefined}
					onPress={press}
				/>
				<Fold isOpen={isShownOpen}>
					<CallRows calls={calls} faces={faces}>
						{rows}
					</CallRows>
				</Fold>
			</div>
			<div className="wg-studio-ai-live-end" ref={end} aria-hidden="true" />
		</Fragment>
	);
}

function liveSlotsOf(chatId: string | undefined, onRowsCounted: (rows: number) => void): LiveSlots {
	if (chatId === undefined) {
		return { tail: null, rows: null };
	}

	return {
		tail: <ListPluginSlot name="chat.live-tail" props={{ chatId, onRowsCounted }} />,
		rows: <ListPluginSlot name="chat.live-rows" props={{ chatId }} />,
	};
}
