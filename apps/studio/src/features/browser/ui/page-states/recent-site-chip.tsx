import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RecentSite } from "@widgetarium/browser/contract";
import { Button } from "@widgetarium/kit";

export interface RecentSiteChipProps {
	readonly site: RecentSite;
	readonly onOpen: (address: string) => void;
}

const CHIP = "cv:h-10 cv:gap-2 cv:ps-2.5 cv:pe-4 cv:text-[13px] cv:font-medium";
const FAVICON = "cv:size-5 cv:flex-none cv:object-cover";
const LETTER =
	"cv:grid cv:size-5 cv:flex-none cv:place-items-center cv:bg-primary cv:text-[12px] cv:font-semibold cv:text-primary-foreground";

export function RecentSiteChip({ site, onOpen }: RecentSiteChipProps): ReactElement {
	return (
		<Button
			variant="outline"
			className={CHIP}
			onClick={() => onOpen(site.address)}
			data-browser-recent-site={site.host}
		>
			{site.favicon === null ? (
				<span className={LETTER}>{site.host.charAt(0).toLowerCase()}</span>
			) : (
				<img className={FAVICON} src={site.favicon} alt="" />
			)}
			{site.host}
		</Button>
	);
}
