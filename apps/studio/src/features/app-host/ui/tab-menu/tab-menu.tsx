import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useLinkCopied } from "../../lib/link-copied/use-link-copied.js";
import type { AppTab } from "@widgetarium/app-host/contract";
import { LinkCopiedNote } from "../link-copied/link-copied.js";
import type { PointedTab, PointerMenu } from "../../lib/use-pointer-menu.js";
import { PointerPopover } from "../pointer-popover/pointer-popover.js";
import { TabRenameField } from "../rename-field/tab-rename-field.js";
import { TabMenuOf } from "./tab-menu-of.js";

export interface TabMenuProps {
	readonly tabs: readonly AppTab[];
	readonly menu: PointerMenu;
	readonly onRenameInPlace?: (tabId: string) => void;
}

const RENAME_FIELD = "cv:w-60";

export function TabMenu({ tabs, menu, onRenameInPlace }: TabMenuProps): ReactElement {
	const [renaming, setRenaming] = useState<PointedTab | null>(null);
	const linkCopied = useLinkCopied();
	const lastTab = useRef<AppTab | null>(null);
	const pointedTab = tabs.find((tab) => tab.id === menu.pointed?.tabId) ?? null;
	const renamedTab = tabs.find((tab) => tab.id === renaming?.tabId) ?? null;

	if (pointedTab !== null) {
		lastTab.current = pointedTab;
	}

	const renameAt = (pointed: PointedTab): void =>
		onRenameInPlace === undefined ? setRenaming(pointed) : onRenameInPlace(pointed.tabId);
	return (
		<span hidden>
			{lastTab.current === null ? null : (
				<TabMenuOf tab={lastTab.current} menu={menu} linkCopied={linkCopied} onRename={renameAt} />
			)}
			<PointerPopover spot={renamedTab === null ? null : (renaming?.spot ?? null)} onDismiss={() => setRenaming(null)}>
				{renamedTab === null ? null : (
					<TabRenameField named={renamedTab} className={RENAME_FIELD} onDone={() => setRenaming(null)} />
				)}
			</PointerPopover>
			<LinkCopiedNote spot={linkCopied.spot} />
		</span>
	);
}
