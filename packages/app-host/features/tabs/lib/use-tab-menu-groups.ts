import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { AppTab } from "../../../shared/schema/app-tab.schema.js";
import { keyHintOf } from "../../../shared/lib/shortcut/key-hint.js";
import {
	AppTabsQuery,
	CloseOtherTabsCommand,
	CloseTabCommand,
	DuplicateTabCommand,
	OpenTabBelowCommand,
	PinTabCommand,
	ReloadTabCommand,
	ReopenClosedTabCommand,
} from "../contract.js";
import { CLOSE_KEY, REOPEN_KEY } from "./tab-keys.js";

export type TabActionKey =
	"new-below" | "duplicate" | "reload" | "rename" | "pin" | "copy-link" | "close" | "close-others" | "reopen";

export interface TabMenuAction {
	readonly key: TabActionKey;
	readonly label: string;
	readonly icon: string;
	readonly hint: string | null;
	readonly isDisabled: boolean;
	readonly run: () => void;
}

export type TabMenuGroups = readonly (readonly TabMenuAction[])[];

export interface TabMenuAsks {
	readonly onRename: () => void;
	readonly onCopyLink: (address: string) => void;
}

interface Said {
	readonly label: string;
	readonly icon: string;
	readonly hint?: string;
	readonly isDisabled?: boolean;
}

export function useTabMenuGroups(tab: AppTab, { onRename, onCopyLink }: TabMenuAsks): TabMenuGroups {
	const { tabs, canReopen } = useQuery(AppTabsQuery).data;
	const run = useTabRuns(tab);
	const action = (key: TabActionKey, said: Said, ran: () => void): TabMenuAction => ({
		key,
		label: said.label,
		icon: said.icon,
		hint: said.hint ?? null,
		isDisabled: said.isDisabled ?? false,
		run: ran,
	});
	const address = tab.address;
	const hasOthers = tabs.some((other) => other.id !== tab.id && !other.isPinned);
	return [
		[
			action("new-below", { label: "New tab below", icon: "plus" }, run.openBelow),
			action("duplicate", { label: "Duplicate tab", icon: "copy-plus" }, run.duplicate),
		],
		[
			action("reload", { label: "Reload tab", icon: "rotate-cw", isDisabled: address === null }, run.reload),
			// TODO: mute tab once the browser package reports a page's audio
			action("rename", { label: "Rename tab…", icon: "pencil" }, onRename),
		],
		[action("pin", { label: tab.isPinned ? "Unpin tab" : "Pin tab", icon: tab.isPinned ? "pin-off" : "pin" }, run.pin)],
		[
			action("copy-link", { label: "Copy link", icon: "link", isDisabled: address === null }, () => {
				if (address !== null) onCopyLink(address);
			}),
			action("close", { label: "Close tab", icon: "x", hint: keyHintOf(CLOSE_KEY, false) }, run.close),
			action("close-others", { label: "Close other tabs", icon: "list-x", isDisabled: !hasOthers }, run.closeOthers),
			action(
				"reopen",
				{ label: "Reopen closed tab", icon: "undo-2", hint: keyHintOf(REOPEN_KEY, true), isDisabled: !canReopen },
				run.reopen,
			),
		],
	];
}

interface TabRuns {
	readonly openBelow: () => void;
	readonly duplicate: () => void;
	readonly reload: () => void;
	readonly pin: () => void;
	readonly close: () => void;
	readonly closeOthers: () => void;
	readonly reopen: () => void;
}

function useTabRuns(tab: AppTab): TabRuns {
	const openBelow = useCommand(OpenTabBelowCommand);
	const duplicate = useCommand(DuplicateTabCommand);
	const reload = useCommand(ReloadTabCommand);
	const pin = useCommand(PinTabCommand);
	const close = useCommand(CloseTabCommand);
	const closeOthers = useCommand(CloseOtherTabsCommand);
	const reopen = useCommand(ReopenClosedTabCommand);
	const id = { id: tab.id };
	return {
		openBelow: () => void openBelow.run(id),
		duplicate: () => void duplicate.run(id),
		reload: () => void reload.run(id),
		pin: () =>
			void pin.run({
				...id,
				isPinned: !tab.isPinned,
			}),
		close: () => void close.run(id),
		closeOthers: () => void closeOthers.run(id),
		reopen: () => void reopen.run(),
	};
}
