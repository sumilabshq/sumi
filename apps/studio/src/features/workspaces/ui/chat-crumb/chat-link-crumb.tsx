import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";
import { linkOf } from "@widgetarium/core/engine/sumi-link.js";
import { MENU_DOOR_MARK } from "../../../command-menu/lib/menu-door-mark.js";
import { CrumbSaid } from "../../../plate/ui/plate-header/crumb-said.js";
import type { CrumbWords } from "../../../plate/ui/plate-header/plate-crumb.js";

export interface ChatLinkCrumbProps {
	readonly chatId: string | null;
	readonly words: CrumbWords;
}

const GO_TO = "Go to";

export function ChatLinkCrumb({ chatId, words }: ChatLinkCrumbProps): ReactElement {
	const toggleMenu = useCommand(ToggleCommandMenuCommand);
	const openMenuWithLink =
		chatId === null
			? undefined
			: () =>
					void toggleMenu.run({
						door: "this-tab",
						text: linkOf({
							kind: "chat",
							id: chatId,
						}),
						shownName: words.second ?? words.first,
					});
	return (
		<button
			type="button"
			className="wg-plate-crumb is-pressable"
			aria-label={`${GO_TO} ${words.second ?? words.first}`}
			aria-disabled={openMenuWithLink === undefined ? true : undefined}
			data-plate-crumb=""
			data-ws-crumb=""
			{...MENU_DOOR_MARK}
			onClick={openMenuWithLink}
		>
			<CrumbSaid words={words} />
		</button>
	);
}
