import { createElement as h, useState, useTransition } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { PAGE_UNASKED } from "@widgetarium/core/gateway/page.js";
import { PagesQuery } from "../../contract.js";
import { useTurnToPage } from "../../lib/use-turn-to-page.js";
import { PanelHeader } from "../../../../shared/ui/side-panel/panel-header.js";
import { PANEL_ROW, PANEL_ROW_INSET_PX } from "../../../../shared/lib/side-panel/panel-row-look.js";
import { PageRow } from "./page-row.js";

const TITLE = "Pages";
const MORE = "More pages";
const LIST = "cv:flex cv:flex-col cv:overflow-auto cv:[scrollbar-width:none]";

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
						className={`${PANEL_ROW} cv:text-muted-foreground`}
						style={{ paddingLeft: PANEL_ROW_INSET_PX }}
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
