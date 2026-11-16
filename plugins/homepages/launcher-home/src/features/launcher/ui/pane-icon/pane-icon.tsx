import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RowIcon } from "@sumi/command-menu-plugin";
import type { Row } from "@sumi/command-menu/contract";
import { useTabFace } from "@sumi/sumi-host-plugin";

export interface PaneIconProps {
	readonly app: string;
	readonly title: string;
	readonly appRows: readonly Row[];
}

export function PaneIcon({ app, title, appRows }: PaneIconProps): ReactElement {
	const TabFace = useTabFace();
	const row = appRows.find(({ intent }) => intent.do === "open-app" && intent.app === app);

	if (row !== undefined) {
		return <RowIcon icon={row.icon} />;
	}

	return (
		<span className="wg-cm-icon">
			<TabFace art={app} favicon={null} title={title} address={null} mark="none" />
		</span>
	);
}
