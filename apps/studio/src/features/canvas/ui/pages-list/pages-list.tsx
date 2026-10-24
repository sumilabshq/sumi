import { createElement as h, useState, useTransition } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { PAGE_UNASKED } from "@widgetarium/core/gateway/page.js";
import { PagesQuery } from "@widgetarium/canvas";
import { useTurnToPage } from "../../lib/use-turn-to-page.js";
import { PanelHeader } from "../side-panel/panel-header.js";
import { PAGE_ROW_SHAPE } from "../../lib/panel-row-look.js";
import { PageRow } from "./page-row.js";

const TITLE = "Pages";
const MORE = "More pages";
const LIST = "cv:flex cv:flex-col cv:gap-0.5 cv:overflow-auto cv:[scrollbar-width:none]";

export function PagesList(): ReactElement {
	const [limit, setLimit] = useState(PAGE_UNASKED);
	const [, startTransition] = useTransition();
	const pages = useQuery(PagesQuery, { cursor: null, limit }).data;
	const turnToPage = useTurnToPage();
	return (
		<section className="cv:pointer-events-auto cv:flex cv:max-h-[40%] cv:flex-none cv:flex-col" data-canvas-pages="">
			<PanelHeader title={TITLE} />
			<div className={LIST} role="listbox" aria-label={TITLE}>
				{pages.items.map((row) => (
					<PageRow key={row.page} row={row} onPick={turnToPage} />
				))}
				{pages.next === null ? null : (
					<div
						className={PAGE_ROW_SHAPE}
						data-quiet=""
						role="button"
						onClick={() => startTransition(() => setLimit(limit + PAGE_UNASKED))}
					>
						{MORE}
					</div>
				)}
			</div>
		</section>
	);
}
