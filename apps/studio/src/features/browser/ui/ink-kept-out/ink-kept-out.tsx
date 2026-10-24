import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { Popover } from "@widgetarium/kit";
import { MascotFigure } from "../../../mascot/ui/mascot-figure/mascot-figure.js";
import type { AccessDecision } from "@widgetarium/browser";
import { useHeldTab } from "../../lib/held-tab.js";
import { SiteAccessQuery } from "@widgetarium/browser";
import { SiteAccessPanel } from "../site-menu/site-access-panel.js";

const BANNER =
	"cv:absolute cv:inset-x-3 cv:top-3 cv:z-[3] cv:flex cv:items-center cv:gap-3 cv:rounded-full cv:bg-raise cv:py-1.5 cv:ps-4 cv:pe-1.5 cv:text-[16px] cv:text-ink cv:shadow-[0_0_0_1px_var(--border),0_10px_28px_color-mix(in_srgb,var(--foreground)_14%,transparent)] cv:[.theme-dark_&]:shadow-[0_0_0_1px_var(--border),0_10px_28px_color-mix(in_srgb,oklch(0_0_0)_50%,transparent)]";
const WORDS = "cv:flex cv:min-w-0 cv:flex-1 cv:flex-col cv:gap-px cv:text-left";
const TITLE = "cv:text-[14px] cv:leading-[normal] cv:font-semibold";
const LINE = "cv:truncate cv:text-[12px] cv:leading-[normal] cv:text-muted-foreground";
const SETTINGS =
	"cv:inline-flex cv:h-10 cv:flex-none cv:cursor-pointer cv:items-center cv:rounded-full cv:border-0 cv:bg-transparent cv:px-3.5 cv:py-0 cv:font-[inherit] cv:text-[13px] cv:font-medium cv:whitespace-nowrap cv:text-ink cv:shadow-[inset_0_0_0_1px_var(--border)] cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const INK_PX = 40;
const KEPT_OUT = "Ink can't look at {host}";
const PAGE_STILL_LOADS = "Your page loads for you; only Ink is kept out.";
const SITE_SETTINGS = "Site settings";

export function InkKeptOut(): ReactElement | null {
	const [isOpen, setOpen] = useState(false);
	const { shown } = useQuery(SiteAccessQuery, { heldTabId: useHeldTab() }).data;

	if (shown === null || !isInkKeptOut(shown)) {
		return null;
	}

	const trigger = (
		<button type="button" className={SETTINGS}>
			{SITE_SETTINGS}
		</button>
	);
	return (
		<div className={BANNER} role="status" data-browser-ink-kept-out="">
			<MascotFigure outfit="bare" size={INK_PX} state="listening" />
			<div className={WORDS}>
				<b className={TITLE}>{KEPT_OUT.replace("{host}", shown.siteKey)}</b>
				<span className={LINE}>{PAGE_STILL_LOADS}</span>
			</div>
			<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger}>
				<SiteAccessPanel />
			</Popover>
		</div>
	);
}

function isInkKeptOut(shown: AccessDecision): boolean {
	return shown.level === "blocked" && shown.source !== "default";
}
