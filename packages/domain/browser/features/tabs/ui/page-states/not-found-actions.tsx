import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AskInkButton } from "../../../../shared/ui/page-state/ask-ink-button.js";
import { QuietAction } from "../../../../shared/ui/page-state/quiet-action.js";
import type { BrowserTabState, PageFailure } from "../../../../shared/schema/browser-tab.schema.js";
import { AskInkCommand, OpenAddressCommand, ReloadPageCommand } from "../../contract.js";
import { hostOf } from "../../lib/failure-copy.js";
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
const ASK_INK = "Ask Ink";

export function NotFoundActions({ tab, failure, searchFor }: NotFoundActionsProps): ReactElement {
	const openAddress = useCommand(OpenAddressCommand);
	const reload = useCommand(ReloadPageCommand);
	const askInk = useCommand(AskInkCommand);
	return (
		<div>
			{tab.nearMatch === null ? null : (
				<NearMatchChip host={tab.nearMatch} onOpen={(address) => void openAddress.run({ tabId: tab.id, address })} />
			)}
			<div className={`${ACTIONS} ${tab.nearMatch === null ? UNDER_REASON : UNDER_MATCH}`}>
				{searchFor(hostOf(failure.address))}
				<QuietAction icon="rotate-cw" label={TRY_AGAIN} onPress={() => void reload.run({ tabId: tab.id })} />
				<AskInkButton label={ASK_INK} onPress={() => void askInk.run({ tabId: tab.id })} />
			</div>
		</div>
	);
}
