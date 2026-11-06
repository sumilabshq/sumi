import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import type { BrowserTabState, PageFailure } from "@widgetarium/browser";
import { OpenAddressCommand, ReloadPageCommand } from "@widgetarium/browser";
import { hostOf } from "../../lib/failure-copy.js";
import { useHeldTab } from "../../lib/held-tab.js";
import { AskInkAction } from "../ask-ink-action/ask-ink-action.js";
import { QuietAction } from "../page-state/quiet-action.js";
import { NearMatchChip } from "./near-match-chip.js";

export interface NotFoundActionsProps {
	readonly tab: BrowserTabState;
	readonly failure: PageFailure;
	readonly searchFor: (text: string) => ReactNode;
}

const ACTIONS = "cv:flex cv:flex-wrap cv:items-center cv:justify-center cv:gap-2";
const UNDER_MATCH = "cv:mt-[14px]";
const UNDER_REASON = "cv:mt-6 cv:@max-[600px]/page:mt-[18px]";
const TRY_AGAIN = "Try again";
const ASK_INK = "Ask Sumi";

export function NotFoundActions({ tab, failure, searchFor }: NotFoundActionsProps): ReactElement {
	const openAddress = useCommand(OpenAddressCommand);
	const reload = useCommand(ReloadPageCommand);
	const heldTabId = useHeldTab();
	const open = (address: string): void =>
		void openAddress.run({
			tabId: tab.id,
			address,
			heldTabId,
		});
	return (
		<div>
			{tab.nearMatch === null ? null : <NearMatchChip host={tab.nearMatch} onOpen={open} />}
			<div className={`${ACTIONS} ${tab.nearMatch === null ? UNDER_REASON : UNDER_MATCH}`}>
				{searchFor(hostOf(failure.address))}
				<QuietAction icon="rotate-cw" label={TRY_AGAIN} onPress={() => void reload.run({ tabId: tab.id })} />
				<AskInkAction tabId={tab.id} label={ASK_INK} />
			</div>
		</div>
	);
}
