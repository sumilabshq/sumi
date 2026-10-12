import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverItem } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/mediator";
import { PageTabsQuery } from "../../requests/pages/page-tabs.js";
import { PageLabel } from "./page-label.js";

export interface PagesPopoverProps {
	readonly onPage: (page: string) => void;
}

const PAGES = "Pages";

export function PagesPopover({ onPage }: PagesPopoverProps): ReactElement {
	const { pages } = useQuery(PageTabsQuery).data;
	const [isPicking, setIsPicking] = useState(false);
	const picked = useRef<string | null>(null);
	const turnToPicked = (): void => {
		const next = picked.current;
		picked.current = null;
		if (next !== null) onPage(next);
	};
	return (
		<Popover
			trigger={
				<span className="cv:inline-flex cv:h-full cv:items-center cv:gap-1 cv:px-2" data-canvas-pages-trigger="">
					{PAGES}
					<Icon name="chevron-down" size={14} />
				</span>
			}
			open={isPicking}
			onOpenChange={setIsPicking}
			onExited={turnToPicked}
			placement="below"
			isPortaled
			className="cv:[&_.wg-kit-pop-inner]:max-h-[320px] cv:[&_.wg-kit-pop-inner]:overflow-y-auto"
		>
			{pages.map((one) => (
				<PopoverItem
					key={one.page}
					checked={one.isShown}
					onClick={() => {
						picked.current = one.page;
						setIsPicking(false);
					}}
				>
					<PageLabel page={one.page} isRunning={one.isRunning} />
				</PopoverItem>
			))}
		</Popover>
	);
}
