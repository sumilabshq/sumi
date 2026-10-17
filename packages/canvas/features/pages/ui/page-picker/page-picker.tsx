import { Fragment, createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/requests";
import { PageChoicesQuery } from "../../contract.js";
import { useTurnToPage } from "../../lib/use-turn-to-page.js";
import { PAGE_NAME_AND_PHOTO_LEAVE } from "../../../../shared/lib/top-bar/app-zone-steps.js";

const PICK_A_PAGE = "Pick a page, {page} shown";
const PAGE_NAME = `cv:truncate ${PAGE_NAME_AND_PHOTO_LEAVE}`;
const TRIGGER =
	"cv:flex cv:h-full cv:min-w-0 cv:cursor-pointer cv:items-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:font-[inherit] cv:text-base cv:font-medium cv:text-ink cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

export function PagePicker(): ReactElement {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const [isOpen, setOpen] = useState(false);
	const { shown, groups } = useQuery(PageChoicesQuery).data;
	const turnToPage = useTurnToPage();
	const pick = (page: string): void => {
		setOpen(false);
		turnToPage(anchor.current, page);
	};
	const trigger = (
		<button type="button" className={TRIGGER} aria-label={PICK_A_PAGE.replace("{page}", shown)}>
			<span className={PAGE_NAME} data-canvas-page-name="">
				{shown}
			</span>
			<Icon name="chevron-down" size={15} />
		</button>
	);
	return (
		<span ref={anchor} className="cv:flex cv:h-full cv:min-w-0" data-canvas-page-picker="">
			<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger}>
				{groups.map((pages, at) => (
					<Fragment key={pages.join()}>
						{at > 0 ? <PopoverSeparator /> : null}
						{pages.map((page) => (
							<PopoverItem key={page} checked={page === shown} onClick={() => pick(page)} data-canvas-page-choice="">
								{page}
							</PopoverItem>
						))}
					</Fragment>
				))}
			</Popover>
		</span>
	);
}
