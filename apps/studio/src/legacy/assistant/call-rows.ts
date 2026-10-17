import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallRow } from "./call-row.js";

export interface CallRowsProps {
	readonly calls: readonly AssistantCall[];
	readonly describe: (call: AssistantCall) => CallFace;
}

export function CallRows({ calls, describe }: CallRowsProps): ReactElement {
	const [openCalls, setOpenCalls] = useState<ReadonlySet<number>>(() => new Set());
	const rows = calls.map((call, at) =>
		h(CallRow, {
			key: `${call.ref}-${at}`,
			call,
			face: describe(call),
			isOpen: openCalls.has(at),
			onToggle: () => setOpenCalls((held) => withToggled(held, at)),
		}),
	);
	return h("div", { className: "wg-studio-ai-tools-list" }, rows);
}

function withToggled(held: ReadonlySet<number>, at: number): ReadonlySet<number> {
	const next = new Set(held);
	if (next.has(at)) next.delete(at);
	else next.add(at);
	return next;
}
