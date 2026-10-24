import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { LinkCopied } from "../../../../shared/lib/link-copied/use-link-copied.js";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import type { PointedTab, PointerMenu } from "../../lib/use-pointer-menu.js";
import { useTabMenuGroups } from "../../lib/use-tab-menu-groups.js";
import { TabMenuLook } from "./tab-menu-look.js";

export interface TabMenuOfProps {
	readonly tab: AppTab;
	readonly menu: PointerMenu;
	readonly linkCopied: LinkCopied;
	readonly onRename: (pointed: PointedTab) => void;
}

export function TabMenuOf({ tab, menu, linkCopied, onRename }: TabMenuOfProps): ReactElement {
	const { pointed } = menu;
	const groups = useTabMenuGroups(tab, {
		onRename: () => {
			if (pointed !== null) onRename(pointed);
		},
		onCopyLink: (address) => {
			if (pointed !== null) linkCopied.copy(address, pointed.spot);
		},
	});
	return <TabMenuLook tabId={tab.id} spot={pointed?.spot ?? null} groups={groups} onDismiss={menu.close} />;
}
