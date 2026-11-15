import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { Fold } from "../fold/fold.js";
import { CallRows } from "../tool-calls/call-rows.js";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
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
	const [isOpen, setOpen] = useRemembersGroupOpen(calls[0]?.ref);
	// TRADE-OFF: a fill reports its rows through a prop, so a second fill of chat.live-tail overwrites the first's count
	const [slotRows, setSlotRows] = useState(0);
	const { tail, rows } = liveSlotsOf(chatId, setSlotRows);
	const canOpen = calls.length > 0 || slotRows > 0;
	const isShownOpen = canOpen && isOpen;
	return (
		<div className="wg-studio-ai-tools">
			<LiveHead
				calls={calls}
				faces={faces}
				session={session}
				tail={tail}
				isOpen={canOpen ? isShownOpen : undefined}
				onPress={() => setOpen(!isOpen)}
			/>
			<Fold isOpen={isShownOpen}>
				<CallRows calls={calls} faces={faces}>
					{rows}
				</CallRows>
			</Fold>
		</div>
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
