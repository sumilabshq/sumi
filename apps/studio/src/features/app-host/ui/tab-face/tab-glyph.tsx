import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppTab } from "@widgetarium/app-host";
import { TabArt } from "./tab-art.js";

export function TabGlyph({ tab }: { readonly tab: AppTab }): ReactElement {
	return <TabArt icon={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} size="row" />;
}
