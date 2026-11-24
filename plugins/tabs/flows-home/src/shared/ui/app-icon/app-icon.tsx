import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";

export interface AppIconProps {
	readonly art: string;
	readonly title: string;
}

export function AppIcon({ art, title }: AppIconProps): ReactElement {
	const TabFace = useTabFace();
	return (
		<span className="sumi-home-icon">
			<TabFace art={art} favicon={null} title={title} address={null} mark="none" />
		</span>
	);
}
