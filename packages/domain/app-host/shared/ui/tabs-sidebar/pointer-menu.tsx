import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ContextMenuContent } from "@widgetarium/kit";
import { POINTER_MENU } from "../../lib/menu-look/menu-look.js";
import type { PointedOutsideGroup } from "../../lib/tabs-sidebar/use-pointed-menus.js";
import type { EssentialTile, ListTarget, TabSection } from "../../schema/app-tab.schema.js";
import { EssentialItems } from "./essential-items.js";
import { SpaceItems } from "./space-items.js";
import { TabItems } from "./tab-items.js";

export type Pointed = PointedOutsideGroup;

export interface PointerMenuProps {
	readonly pointed: Pointed;
	readonly sections: readonly TabSection[];
	readonly listTargets: readonly ListTarget[];
	readonly essentials: readonly EssentialTile[];
	readonly onRename: (tabId: string) => void;
	readonly onGroupMade: (groupId: string) => void;
}

export function PointerMenu(props: PointerMenuProps): ReactElement {
	return (
		<ContextMenuContent className={POINTER_MENU} data-tabs-pointer-menu={props.pointed.kind}>
			{props.pointed.kind === "tab" ? <TabItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "essential" ? <EssentialItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "space" ? <SpaceItems {...props} pointed={props.pointed} /> : null}
		</ContextMenuContent>
	);
}
