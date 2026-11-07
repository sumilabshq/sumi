import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useWritesDockHeight } from "../../lib/use-writes-dock-height.js";

export function ChatDock({ children }: { readonly children: ReactNode }): ReactElement {
	const dock = useRef<HTMLDivElement>(null);
	useWritesDockHeight(dock);
	return (
		<div className="wg-studio-ai-dock" ref={dock}>
			{children}
		</div>
	);
}
