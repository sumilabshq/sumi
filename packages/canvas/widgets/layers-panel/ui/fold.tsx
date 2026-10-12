import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export function Fold({ isOpen, children }: { readonly isOpen: boolean; readonly children?: ReactNode }): ReactElement {
	return (
		<div
			className={`cv:grid cv:w-max cv:min-w-full cv:transition-[grid-template-rows,opacity] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none ${isOpen ? "cv:grid-rows-[1fr] cv:opacity-100" : "cv:grid-rows-[0fr] cv:opacity-0"}`}
			data-canvas-fold={isOpen ? "open" : "shut"}
		>
			<div
				className={`cv:min-h-0 cv:overflow-hidden ${isOpen ? "cv:group-data-[dragging]/tree:overflow-visible" : ""}`}
			>
				{children}
			</div>
		</div>
	);
}
