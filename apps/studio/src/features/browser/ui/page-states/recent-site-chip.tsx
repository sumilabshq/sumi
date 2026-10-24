import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RecentSite } from "@widgetarium/browser";
import { BUTTON_RESET, EDGED } from "../../lib/page-state-look.js";

export interface RecentSiteChipProps {
	readonly site: RecentSite;
	readonly onOpen: (address: string) => void;
}

const CHIP = `${BUTTON_RESET} ${EDGED} cv:text-ink cv:h-10 cv:gap-2 cv:rounded-full cv:ps-2.5 cv:pe-4 cv:text-[13px]`;
const FAVICON = "cv:size-5 cv:flex-none cv:rounded-[6px] cv:object-cover";
const LETTER =
	"cv:grid cv:size-5 cv:flex-none cv:place-items-center cv:rounded-[6px] cv:bg-primary cv:text-[12px] cv:font-semibold cv:text-primary-foreground";

export function RecentSiteChip({ site, onOpen }: RecentSiteChipProps): ReactElement {
	return (
		<button type="button" className={CHIP} onClick={() => onOpen(site.address)} data-browser-recent-site={site.host}>
			{site.favicon === null ? (
				<span className={LETTER}>{site.host.charAt(0).toLowerCase()}</span>
			) : (
				<img className={FAVICON} src={site.favicon} alt="" />
			)}
			{site.host}
		</button>
	);
}
