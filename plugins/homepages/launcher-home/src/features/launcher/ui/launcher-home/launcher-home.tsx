import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { HomePanel } from "@sumi/command-menu-plugin";
import type { HomeViewProps } from "@sumi/home-pages-plugin";
import { LauncherGreeting } from "../launcher-greeting/launcher-greeting.js";
import { LauncherHints } from "../launcher-hints/launcher-hints.js";
import { LauncherIdle } from "../launcher-idle/launcher-idle.js";

const PLACEHOLDER = "Open an app, a site, or search";
const SEARCH_ICON_PX = 15;

export function LauncherHome({ tabId }: HomeViewProps): ReactElement {
	return (
		<div className="sumi-launcher">
			<HomePanel
				homeTabId={tabId}
				head={<LauncherGreeting />}
				idle={(view) => <LauncherIdle view={view} homeTabId={tabId} />}
				placeholder={PLACEHOLDER}
				fieldStart={<Icon name="search" size={SEARCH_ICON_PX} />}
				fieldEnd={<LauncherHints />}
				isHintless
			/>
		</div>
	);
}
