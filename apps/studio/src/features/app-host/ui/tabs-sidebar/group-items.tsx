import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ContextMenuGroup, ContextMenuSeparator } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { POINTER_LINE } from "../../lib/menu-look/menu-look.js";
import { groupFaceOf } from "../../lib/tabs-sidebar/sidebar-groups.js";
import { GroupColourMenu } from "./group-colour-menu.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

export function GroupItems({
	pointed,
	sidebar,
	onRename,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "group" }> }): ReactElement | null {
	const ungroup = useCommand(appHost.groups.ungroup);
	const closeGroup = useCommand(appHost.tabActions.closeGroup);
	const group = groupFaceOf(sidebar, pointed.id);

	if (group === null) {
		return null;
	}

	return (
		<ContextMenuGroup data-tabs-group-menu={group.id}>
			<PointerItem icon="pencil" label="Rename" onSelect={() => onRename(group.id)} />
			<GroupColourMenu group={group} />
			<PointerItem icon="ungroup" label="Ungroup" onSelect={() => void ungroup.run({ id: group.id })} />
			<ContextMenuSeparator className={POINTER_LINE} />
			<PointerItem icon="x" label={closeSaid(group.count)} onSelect={() => void closeGroup.run({ id: group.id })} />
		</ContextMenuGroup>
	);
}

function closeSaid(count: number): string {
	if (count === 0) {
		return "Remove group";
	}

	return count === 1 ? "Close 1 tab" : `Close ${count} tabs`;
}
