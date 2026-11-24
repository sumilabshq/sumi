import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppIcon } from "../../../../shared/ui/app-icon/app-icon.js";
import type { SetupFacts } from "../../lib/use-setup-tiles.js";

type SetupNode = SetupFacts["root"];

export interface SetupThumbProps {
	readonly root: SetupNode;
	artOf(appId: string): string;
}

const NO_TABS_ART = "site";

export function SetupThumb({ root, artOf }: SetupThumbProps): ReactElement {
	return (
		<span className="sumi-home-thumb" aria-hidden="true">
			<ThumbNode node={root} artOf={artOf} />
		</span>
	);
}

function ThumbNode({ node, artOf }: { readonly node: SetupNode; artOf(appId: string): string }): ReactElement {
	if (node.kind === "pane") {
		const first = node.tabs[0];
		return (
			<span className="sumi-home-cell">
				<AppIcon art={first === undefined ? NO_TABS_ART : artOf(first.app)} title={first?.app ?? ""} />
			</span>
		);
	}

	return (
		<span className="sumi-home-split" data-dir={node.dir}>
			{node.children.map((child, at) => (
				<span key={at} className="sumi-home-part" style={{ flex: node.shares[at] ?? 1 }}>
					<ThumbNode node={child} artOf={artOf} />
				</span>
			))}
		</span>
	);
}
