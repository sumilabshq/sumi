import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { ContextMenuGroup, ContextMenuSeparator } from "@widgetarium/kit";
import { CloseEssentialCommand, RemoveEssentialCommand } from "@widgetarium/app-host";
import { POINTER_LINE } from "../../lib/menu-look/menu-look.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

export function EssentialItems({
	pointed,
	sidebar,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "essential" }> }): ReactElement {
	const removeFromEssentials = useCommand(RemoveEssentialCommand);
	const closeEssential = useCommand(CloseEssentialCommand);
	const isLive = sidebar.essentials.some((tile) => tile.id === pointed.id && tile.isLive);
	return (
		<ContextMenuGroup>
			<PointerItem
				icon="grid-minus"
				label="Remove from Essentials"
				onSelect={() => void removeFromEssentials.run({ id: pointed.id })}
			/>
			<ContextMenuSeparator className={POINTER_LINE} />
			<PointerItem
				icon="x"
				label="Close"
				isDisabled={!isLive}
				onSelect={() => void closeEssential.run({ id: pointed.id })}
			/>
		</ContextMenuGroup>
	);
}
