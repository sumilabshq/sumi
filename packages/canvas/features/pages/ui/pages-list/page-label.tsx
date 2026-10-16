import { createElement as h } from "react";
import type { ReactElement } from "react";

const RUNNING_DOT = "cv:size-2 cv:flex-none cv:rounded-full cv:bg-brand cv:motion-safe:animate-canvas-pulse";

export function PageLabel({ page, isRunning }: { readonly page: string; readonly isRunning: boolean }): ReactElement {
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-1.5">
			{isRunning ? <span className={RUNNING_DOT} /> : null}
			<span>{page}</span>
		</span>
	);
}
