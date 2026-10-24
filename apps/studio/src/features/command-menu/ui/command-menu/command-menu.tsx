import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { portalLayer } from "@widgetarium/kit";
import { CloseCommandMenuCommand, CommandMenuQuery } from "@widgetarium/command-menu";
import { useMenuPresence } from "../../lib/use-menu-presence.js";
import { MenuPanel } from "./menu-panel.js";

const MENU = "Command menu";

export function CommandMenu(): ReactElement | null {
	const menu = useQuery(CommandMenuQuery).data;
	const close = useCommand(CloseCommandMenuCommand);
	const presence = useMenuPresence(menu.isOpen);

	if (!presence.isMounted) {
		return null;
	}

	return createPortal(
		<div className="wg-cm-layer" data-command-menu="" data-shown={presence.isShown ? "" : undefined}>
			<div className="wg-cm-outside" aria-hidden="true" onPointerDown={() => void close.run()} />
			<div className="wg-cm-panel" role="dialog" aria-modal="true" aria-label={MENU} onTransitionEnd={presence.settled}>
				<MenuPanel key={menu.opening} door={menu.door} startText={menu.text} />
			</div>
		</div>,
		portalLayer(),
	);
}
