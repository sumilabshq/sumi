import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { RecentSite } from "@widgetarium/browser";
import { OpenAddressCommand } from "@widgetarium/browser";
import { useHeldTab } from "../../lib/held-tab.js";
import { AskInkAction } from "../ask-ink-action/ask-ink-action.js";
import { NewTabField } from "./new-tab-field.js";
import { RecentSiteChip } from "./recent-site-chip.js";
import { StateCard } from "./state-card.js";

export interface NewTabPageProps {
	readonly tabId: string;
	readonly recentSites: readonly RecentSite[];
}

const RECENT = "cv:mt-[22px] cv:flex cv:flex-col cv:items-center cv:gap-2.5";
const RECENT_LABEL = "cv:text-[13px] cv:font-medium cv:text-muted-foreground";
const CHIPS = "cv:flex cv:flex-wrap cv:justify-center cv:gap-2";
const ASK_SPACE = "cv:mt-1.5";
const RECENT_SHOWN = 4;
const WHERE_TO = "Where to?";
const RECENT_WORD = "Recent";
const ASK_TO_FIND = "Ask Ink to find it";

export function NewTabPage({ tabId, recentSites }: NewTabPageProps): ReactElement {
	const openAddress = useCommand(OpenAddressCommand);
	const heldTabId = useHeldTab();
	const open = (address: string): void =>
		void openAddress.run({
			tabId,
			address,
			heldTabId,
		});
	const shown = recentSites.slice(0, RECENT_SHOWN);
	return (
		<StateCard mood="idle" title={WHERE_TO}>
			<NewTabField onOpen={open} />
			<div className={RECENT}>
				{shown.length === 0 ? null : (
					<span className={RECENT_LABEL} data-browser-recent-label="">
						{RECENT_WORD}
					</span>
				)}
				{shown.length === 0 ? null : (
					<div className={CHIPS}>
						{shown.map((site) => (
							<RecentSiteChip key={site.host} site={site} onOpen={open} />
						))}
					</div>
				)}
				<div className={ASK_SPACE}>
					<AskInkAction tabId={tabId} label={ASK_TO_FIND} />
				</div>
			</div>
		</StateCard>
	);
}
