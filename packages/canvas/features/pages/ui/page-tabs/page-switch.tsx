import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/requests";
import { PageTabsQuery } from "../../contract.js";
import { PAGES_TAB } from "../../../../shared/schema/canvas-page.schema.js";
import { PagesPopover } from "./pages-popover.js";

export interface PageSwitchProps {
	readonly onPage: (page: string) => void;
}

const SWITCH =
	"cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)] cv:[&_.wg-kit-anchor]:flex cv:[&_.wg-kit-anchor]:h-full cv:[&_button]:h-[calc(var(--wg-kit-control-s)-4px)] cv:[&_button:has([data-canvas-pages-trigger])]:p-0";

export function PageSwitch({ onPage }: PageSwitchProps): ReactElement {
	const tabs = useQuery(PageTabsQuery).data;
	const pagesTab = tabs.pages.length > 0 ? [{ value: PAGES_TAB, label: <PagesPopover onPage={onPage} /> }] : [];
	return (
		<span className="cv:inline-flex" data-canvas-page-switch="">
			<Segmented<string>
				items={[...tabs.leading.map(tabOf), ...pagesTab, ...tabs.trailing.map(tabOf)]}
				value={tabs.shownTab}
				onValueChange={(next) => {
					if (next !== PAGES_TAB) onPage(next);
				}}
				size="s"
				className={SWITCH}
			/>
		</span>
	);
}

function tabOf(page: string): { readonly value: string; readonly label: string } {
	return { value: page, label: page };
}
