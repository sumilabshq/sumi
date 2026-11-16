import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HomePanel } from "@sumi/command-menu-plugin";
import type { HomeViewProps } from "@sumi/home-pages-plugin";
import { LauncherGreeting } from "../launcher-greeting/launcher-greeting.js";
import { LauncherIdle } from "../launcher-idle/launcher-idle.js";

const PLACEHOLDER = "Type to open anything, or ask Sumi";

export function LauncherHome({ tabId }: HomeViewProps): ReactElement {
	return (
		<div className="sumi-launcher">
			<HomePanel
				homeTabId={tabId}
				head={<LauncherGreeting />}
				idle={(view) => <LauncherIdle view={view} homeTabId={tabId} />}
				placeholder={PLACEHOLDER}
			/>
		</div>
	);
}
