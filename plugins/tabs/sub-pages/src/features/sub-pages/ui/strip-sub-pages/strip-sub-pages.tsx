import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, PartButton, Popover, PopoverContent, PopoverItem, PopoverTrigger } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { TabIcons } from "@sumi/tab-strip-plugin";
import { pageEntryOf } from "../../lib/page-entries.js";

export interface StripSubPagesProps {
	readonly tabId: string;
}

const LIST = "Sub-pages of {title}";
const HEAD = "Sub-pages · {count}";
const CHEVRON_PX = 12;

export function StripSubPages({ tabId }: StripSubPagesProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const showTab = useCommand(appHost.tabs.showTab);
	const [isOpen, setOpen] = useState(false);
	const page = pageEntryOf(sidebar, tabId);

	if (page === null || page.subPages.length === 0) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger asChild>
				<PartButton
					className="sumi-sub-pages-chevron"
					label={LIST.replace("{title}", page.tab.title)}
					aria-expanded={isOpen}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
				>
					<Icon name="chevron-down" size={CHEVRON_PX} />
				</PartButton>
			</PopoverTrigger>
			<PopoverContent side="bottom" align="start" className="is-compact sumi-sub-pages-menu">
				<div role="menu" aria-label={LIST.replace("{title}", page.tab.title)}>
					<div className="sumi-sub-pages-head">{HEAD.replace("{count}", String(page.subPages.length))}</div>
					{page.subPages.map(({ tab }) => (
						<PopoverItem
							key={tab.id}
							role="menuitem"
							checked={tab.isShown}
							onClick={() => {
								setOpen(false);
								void showTab.run({ id: tab.id });
							}}
						>
							<TabIcons item={{ kind: "tab", tab, list: tabId, groupId: null, group: null }} />
							<span className="sumi-sub-pages-title">{tab.title}</span>
						</PopoverItem>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
