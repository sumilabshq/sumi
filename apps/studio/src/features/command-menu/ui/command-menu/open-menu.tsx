import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { CloseCommandMenuCommand } from "@widgetarium/command-menu";
import type { KeptMenu } from "@widgetarium/command-menu";
import { useClosesOnPressOutside } from "../../lib/use-closes-on-press-outside.js";
import { MenuPanel } from "./menu-panel.js";

const MENU = "Command menu";

export function OpenMenu({ menu }: { readonly menu: KeptMenu }): ReactElement {
	const close = useCommand(CloseCommandMenuCommand);
	const panel = useClosesOnPressOutside(() => void close.run());
	return (
		<div className="wg-cm-layer" data-command-menu="">
			<div ref={panel} className="wg-cm-panel" role="dialog" aria-label={MENU}>
				<MenuPanel key={menu.opening} door={menu.door} startText={menu.text} pageId={menu.pageId} />
			</div>
		</div>
	);
}
