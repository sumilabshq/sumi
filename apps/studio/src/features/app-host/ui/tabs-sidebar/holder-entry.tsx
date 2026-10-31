import { createElement as h, useContext } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { SidebarTab, TabChild } from "@widgetarium/app-host";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import type { RowBadge } from "../tab-row/row-badge.js";
import { SidebarCard } from "../sidebar-card/sidebar-card.js";
import type { CardMarks } from "../sidebar-card/sidebar-card.js";
import { CARD_RADIUS_PX } from "../../lib/tabs-look/tabs-look.js";
import { DropTint } from "../drop-tint/drop-tint.js";
import { HolderRows } from "./holder-rows.js";
import { LIFTED_HIDDEN, LiftedContext, liftedWithout, useLiftedMark } from "../../lib/tab-drag/lifted-look.js";

export interface HolderEntryProps {
	readonly holder: SidebarTab;
	readonly children: readonly TabChild[];
	readonly groupId: string | null;
	readonly splitId?: string | null;
	readonly renaming: RowRenaming;
	readonly badge?: RowBadge | null;
}

const LIFTED_HOLDER: CSSProperties = {
	...LIFTED_HIDDEN,
	position: "relative",
};
const CARD_MARKS: CardMarks = {
	"data-tabs-card": "",
};
const LIFTED_CARD_MARKS: CardMarks = {
	"data-tabs-card": "",
	"data-tabs-lifted": "",
	"data-tabs-lifted-holder": "",
};

export function HolderEntry(props: HolderEntryProps): ReactElement {
	const lifted = useLiftedMark(props.holder.tab.id, props.splitId ?? null);
	const look = useContext(LiftedContext);

	if (props.children.length === 0) {
		return <HolderRows {...props} />;
	}

	return (
		<SidebarCard
			isOpen={!(props.holder.isFolded ?? false)}
			style={lifted === null ? undefined : LIFTED_HOLDER}
			marks={lifted === null ? CARD_MARKS : LIFTED_CARD_MARKS}
		>
			{lifted === null ? null : <DropTint isOn={lifted.isMarked} radius={CARD_RADIUS_PX} />}
			{lifted === null ? (
				<HolderRows {...props} />
			) : (
				<LiftedContext.Provider value={liftedWithout(look, props.holder.tab.id)}>
					<HolderRows {...props} />
				</LiftedContext.Provider>
			)}
		</SidebarCard>
	);
}
