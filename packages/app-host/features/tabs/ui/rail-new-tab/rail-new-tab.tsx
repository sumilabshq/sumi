import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RailRoundButton } from "../../../../shared/ui/column-foot/rail-round-button.js";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";

const NEW_TAB = "New tab";

export function RailNewTab(): ReactElement {
	return <RailRoundButton icon="plus" label={NEW_TAB} onClick={useOpensBrowserTab()} data-host-column-add="" />;
}
