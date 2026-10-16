import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { OutputOf } from "@widgetarium/core/requests";
import type { PagesQuery } from "../../contract.js";
import { PANEL_ROW, PANEL_ROW_INSET_PX, PANEL_ROW_OPENER } from "../../../../shared/lib/side-panel/panel-row-look.js";
import { PageLabel } from "./page-label.js";

type ListedPage = OutputOf<typeof PagesQuery>["items"][number];

export interface PageRowProps {
	readonly row: ListedPage;
	readonly onPick: (from: Element, page: string) => void;
}

export function PageRow({ row, onPick }: PageRowProps): ReactElement {
	return (
		<div
			className={PANEL_ROW}
			style={{ paddingLeft: PANEL_ROW_INSET_PX }}
			role="option"
			aria-selected={row.isShown}
			data-picked={row.isShown ? "" : undefined}
			data-canvas-page={row.page}
			onClick={(event) => onPick(event.currentTarget, row.page)}
		>
			<span className={PANEL_ROW_OPENER} />
			<Icon name="file" size={14} />
			<PageLabel page={row.page} isRunning={row.isRunning} />
		</div>
	);
}
