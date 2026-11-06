import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { OutputOf } from "@widgetarium/data-framework";
import type { PagesQuery } from "@widgetarium/canvas";
import { PAGE_ROW } from "../../lib/panel-row-look.js";

type ListedPage = OutputOf<typeof PagesQuery>["items"][number];

export interface PageRowProps {
	readonly row: ListedPage;
	readonly onPick: (from: Element, page: string) => void;
}

const DOT = "cv:size-1.5 cv:flex-none cv:rounded-full";
const RESTING_DOT = `${DOT} cv:bg-page-dot`;
const SHOWN_DOT = `${DOT} cv:bg-brand`;
const RUNNING_DOT = `${SHOWN_DOT} cv:motion-safe:animate-canvas-pulse`;

export function PageRow({ row, onPick }: PageRowProps): ReactElement {
	return (
		<div
			className={PAGE_ROW}
			role="option"
			aria-selected={row.isShown}
			data-picked={row.isShown ? "" : undefined}
			data-canvas-page={row.page}
			onClick={(event) => onPick(event.currentTarget, row.page)}
		>
			<span className={dotOf(row)} aria-hidden data-canvas-page-dot="" />
			<span className="cv:truncate">{row.page}</span>
		</div>
	);
}

function dotOf({ isRunning, isShown }: ListedPage): string {
	if (isRunning) {
		return RUNNING_DOT;
	}

	return isShown ? SHOWN_DOT : RESTING_DOT;
}
