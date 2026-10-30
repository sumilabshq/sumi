import { Fragment, createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { CloseShortcut } from "../../../app-host/ui/close-shortcut/close-shortcut.js";
import { NewTabShortcut } from "../../../app-host/ui/new-tab-shortcut/new-tab-shortcut.js";
import { ReopenShortcut } from "../../../app-host/ui/reopen-shortcut/reopen-shortcut.js";

export function SidebarKeys({ column }: { readonly column: RefObject<HTMLElement | null> }): ReactElement {
	return (
		<>
			<CloseShortcut frame={column} />
			<NewTabShortcut frame={column} />
			<ReopenShortcut frame={column} />
		</>
	);
}
