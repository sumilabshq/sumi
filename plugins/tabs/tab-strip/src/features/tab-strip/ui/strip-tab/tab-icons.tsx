import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import type { StripItem } from "../../lib/strip-items.js";

export function TabIcons({ item }: { readonly item: StripItem }): ReactElement {
	const TabFace = useTabFace();
	const tabs = item.kind === "tab" ? [item.tab] : item.split.members.map((member) => member.item.tab);
	return (
		<span className="sumi-strip-tab-icons">
			{tabs.map((tab) => (
				<span key={tab.id} className="sumi-strip-tab-icon">
					<TabFace art={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} mark={tab.mark} />
				</span>
			))}
		</span>
	);
}
