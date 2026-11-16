import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HomePanel } from "@sumi/command-menu-plugin";
import type { HomeViewProps } from "@sumi/home-pages-plugin";

export function CommandMenuHome({ tabId }: HomeViewProps): ReactElement {
	return <HomePanel homeTabId={tabId} head={null} idle={null} placeholder={null} />;
}
