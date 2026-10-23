import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ContextMenuContent } from "@widgetarium/kit";
import { POINTER_MENU } from "../../lib/menu-look/menu-look.js";
import type { PointedItem } from "../../lib/tabs-sidebar/pointed-of.js";
import type { EssentialTile, SidebarEntry } from "../../schema/app-tab.schema.js";
import { EssentialItems } from "./essential-items.js";
import { SpaceItems } from "./space-items.js";
import { TabItems } from "./tab-items.js";

export type Pointed = Exclude<PointedItem, { readonly kind: "group" }>;

export interface PointerMenuProps {
	readonly pointed: Pointed;
	readonly entries: readonly SidebarEntry[];
	readonly essentials: readonly EssentialTile[];
	readonly onRename: (tabId: string) => void;
	readonly onGroupMade: (groupId: string) => void;
}

export function PointerMenu(props: PointerMenuProps): ReactElement {
	return (
		<ContextMenuContent className={POINTER_MENU} data-tabs-pointer-menu={props.pointed.kind}>
			{props.pointed.kind === "tab" ? <TabItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "essential" ? <EssentialItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "space" ? <SpaceItems {...props} /> : null}
		</ContextMenuContent>
	);
}
