import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { GroupItem, SidebarSplitState } from "@widgetarium/app-host";
import { SIDEBAR_ROW, ROW_WORDS } from "../../lib/tabs-look/tabs-look.js";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import { useRowPick } from "../../lib/tabs-sidebar/use-row-pick.js";
import { RowIcon } from "../tab-row/row-icon.js";
import { SplitMapIcon } from "../split-map/split-map-icon.js";

export interface SplitRowProps {
	readonly split: SidebarSplitState;
	readonly focused: GroupItem;
}

const JOINER = " + ";
const STACK = "cv:flex cv:flex-none cv:items-center cv:[&>*+*]:-ms-1";
const STACKED = "cv:flex cv:rounded-[4px] cv:bg-(--sumi-plate) cv:[box-shadow:0_0_0_2px_var(--sumi-frame)]";
const MAP = "cv:ms-auto cv:flex cv:flex-none";

export function SplitRow({ split, focused }: SplitRowProps): ReactElement {
	const { show } = useRowPick(focused);
	const title = split.members.map((member) => rowFaceOf(member.item).title).join(JOINER);
	return (
		<button type="button" className={SIDEBAR_ROW} onClick={show} data-split-row={split.id}>
			<span className={STACK} aria-hidden="true">
				{split.members.map((member) => (
					<span key={rowFaceOf(member.item).id} className={STACKED}>
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
