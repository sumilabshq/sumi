import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarSplitState, SidebarTab } from "@widgetarium/app-host/contract";
import { SIDEBAR_ROW, ROW_WORDS } from "../../lib/tabs-look/tabs-look.js";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import { useRowPick } from "../../lib/tabs-sidebar/use-row-pick.js";
import { RowIcon } from "../tab-row/row-icon.js";
import { SplitMapIcon } from "../split-map/split-map-icon.js";

export interface SplitRowProps {
	readonly split: SidebarSplitState;
	readonly focused: SidebarTab;
}

const JOINER = " + ";
const STACK = "cv:flex cv:flex-none cv:items-center cv:[&>*+*]:-ms-1";
const STACKED = "cv:relative cv:flex cv:[&+&]:[filter:drop-shadow(-1.5px_0_0_var(--split-ring))]";
const MAP = "cv:ms-auto cv:flex cv:flex-none";
const SPLIT_RING =
	"cv:[--split-ring:var(--sumi-plate)] cv:hover:[--split-ring:color-mix(in_srgb,var(--sumi-plate),var(--sumi-text)_5%)]";

export function SplitRow({ split, focused }: SplitRowProps): ReactElement {
	const { show } = useRowPick(focused);
	const title = split.members.map((member) => rowFaceOf(member.item).title).join(JOINER);
	return (
		<button type="button" className={`${SIDEBAR_ROW} ${SPLIT_RING}`} onClick={show} data-split-row={split.id}>
			<span className={STACK} aria-hidden="true">
				{split.members.map((member, at) => (
					<span key={rowFaceOf(member.item).id} className={STACKED} style={{ zIndex: at + 1 }}>
						<RowIcon item={member.item} />
					</span>
				))}
			</span>
			<span className={ROW_WORDS} data-split-title="">
				{title}
			</span>
			<span className={MAP}>
				<SplitMapIcon map={split.map} label={null} />
			</span>
		</button>
	);
}
