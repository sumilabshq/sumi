import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallRow } from "./call-row.js";

export interface CallRowsProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly children?: ReactNode;
}

export function CallRows({ calls, faces, children }: CallRowsProps): ReactElement {
	const [openCalls, setOpenCalls] = useState<ReadonlySet<number>>(() => new Set());
	return (
		<div className="wg-studio-ai-tools-list">
			{calls.map((call, at) => {
				const face = faces[at];
				return face ? (
					<CallRow
						key={`${call.ref}-${at}`}
						call={call}
						face={face}
						isOpen={openCalls.has(at)}
						onToggle={() => setOpenCalls((held) => withToggled(held, at))}
					/>
				) : null;
			})}
			{children}
		</div>
	);
}

function withToggled(held: ReadonlySet<number>, at: number): ReadonlySet<number> {
	const next = new Set(held);

	if (next.has(at)) {
		next.delete(at);
		return next;
	}

	next.add(at);
	return next;
}
