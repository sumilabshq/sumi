import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ContextMenuGroup, ContextMenuSeparator } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { TabsSidebar } from "@widgetarium/app-host/contract";
import { POINTER_LINE } from "../../lib/menu-look/menu-look.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

const CLOSE_TABS = "Close {count} tabs";

export function SplitItems({
	pointed,
	sidebar,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "split" }> }): ReactElement | null {
	const unsplit = useCommand(appHost.splits.unsplit);
	const closeTabs = useCommand(appHost.tabActions.closeTabs);
	const tabIds = memberIdsOf(sidebar, pointed.id);

	if (tabIds.length === 0) {
		return null;
	}

	return (
		<ContextMenuGroup data-tabs-split-menu={pointed.id}>
			<PointerItem icon="panel-right-close" label="Unsplit" onSelect={() => void unsplit.run({ tabIds })} />
			<ContextMenuSeparator className={POINTER_LINE} />
			<PointerItem
				icon="x"
				label={CLOSE_TABS.replace("{count}", String(tabIds.length))}
				onSelect={() => void closeTabs.run({ ids: tabIds })}
			/>
		</ContextMenuGroup>
	);
}

function memberIdsOf(sidebar: TabsSidebar, splitId: string): readonly string[] {
	const split = sidebar.sections
		.flatMap((section) => section.entries)
		.find((entry) => entry.kind === "split" && entry.split.id === splitId);
	return split?.kind === "split" ? split.split.members.map((member) => member.item.tab.id) : [];
}
