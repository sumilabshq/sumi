import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ContextMenuContent } from "@widgetarium/kit";
import { POINTER_MENU } from "../../lib/menu-look/menu-look.js";
import type { PointedItem } from "../../lib/tabs-sidebar/pointed-of.js";
import type { TabsSidebar } from "@widgetarium/app-host/contract";
import { EssentialItems } from "./essential-items.js";
import { GroupItems } from "./group-items.js";
import { SpaceItems } from "./space-items.js";

export type Pointed = PointedItem;

export interface PointerMenuProps {
	readonly pointed: Pointed;
	readonly sidebar: TabsSidebar;
	readonly onRename: (id: string) => void;
}

export function PointerMenu(props: PointerMenuProps): ReactElement {
	return (
		<ContextMenuContent className={POINTER_MENU} data-tabs-pointer-menu={props.pointed.kind}>
			{props.pointed.kind === "space" ? <SpaceItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "essential" ? <EssentialItems {...props} pointed={props.pointed} /> : null}
			{props.pointed.kind === "group" ? <GroupItems {...props} pointed={props.pointed} /> : null}
		</ContextMenuContent>
	);
}
