import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";

const ROUND =
	"cv:grid cv:size-10 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:bg-raise cv:p-0 cv:text-ink cv:shadow-none cv:transition-[background-color] cv:duration-150 cv:ease-standard cv:hover:bg-raise/70 cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const NEW_TAB = "New tab";

export function RailNewTab(): ReactElement {
	const openBrowserTab = useOpensBrowserTab();
	return (
		<Tip label={NEW_TAB}>
			<button type="button" aria-label={NEW_TAB} className={ROUND} onClick={openBrowserTab} data-host-column-add="">
				<Icon name="plus" size={18} />
			</button>
		</Tip>
	);
}
