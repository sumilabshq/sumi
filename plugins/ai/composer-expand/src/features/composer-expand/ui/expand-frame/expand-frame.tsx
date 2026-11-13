import { createElement as h, useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ExpandingContext } from "../../lib/expanding-context.js";
import { useCollapsesOnSend } from "../../lib/use-collapses-on-send.js";

export interface ExpandFrameProps {
	readonly chatId: string | null;
	readonly children: ReactNode;
}

export function ExpandFrame({ chatId, children }: ExpandFrameProps): ReactElement {
	const [isExpanded, setExpanded] = useState(false);
	const frame = useRef<HTMLDivElement>(null);
	const collapse = useCallback(() => setExpanded(false), []);
	useCollapsesOnSend(chatId, collapse);
	const expanding = useMemo(() => ({ isExpanded, frame, setExpanded }), [isExpanded]);
	return (
		<ExpandingContext.Provider value={expanding}>
			<div className={`sumi-composer-expand${isExpanded ? " is-expanded" : ""}`} ref={frame}>
				{children}
			</div>
		</ExpandingContext.Provider>
	);
}
