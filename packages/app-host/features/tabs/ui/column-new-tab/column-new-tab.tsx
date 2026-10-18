import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";
import { NEW_TAB_KEY } from "../new-tab-shortcut/new-tab-shortcut.js";

const ROW =
	"cv:flex cv:h-12 cv:w-full cv:flex-none cv:cursor-pointer cv:items-center cv:justify-start cv:gap-2.5 cv:rounded-full cv:border-0 cv:bg-transparent cv:py-0 cv:ps-3.5 cv:pe-4 cv:text-start cv:font-[inherit] cv:text-sm cv:font-medium cv:text-muted-foreground cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const KEY_HINT =
	"cv:ms-auto cv:border-0 cv:bg-transparent cv:p-0 cv:font-mono cv:text-xs cv:font-medium cv:text-[var(--wg-studio-tabs-faint)] cv:shadow-none";
const NEW_TAB = "New tab";
const COMMAND_KEY = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "") ? "⌘" : "Ctrl";

export function ColumnNewTab(): ReactElement {
	const openBrowserTab = useOpensBrowserTab();
	return (
		<button type="button" className={ROW} onClick={openBrowserTab} data-host-column-add="">
			<Icon name="plus" size={16} className="cv:flex-none" />
			{NEW_TAB}
			<kbd className={KEY_HINT} data-host-new-tab-key="">{`${COMMAND_KEY} ${NEW_TAB_KEY.toUpperCase()}`}</kbd>
		</button>
	);
}
