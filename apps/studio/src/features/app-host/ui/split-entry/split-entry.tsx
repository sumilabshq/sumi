import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarSplitState } from "@widgetarium/app-host";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { SplitMapIcon } from "../split-map/split-map-icon.js";
import { FoldBox } from "../fold-box/fold-box.js";
import { SwapLayer } from "../swap-layer/swap-layer.js";
import { SplitMemberRow } from "./split-member-row.js";
import { SplitRow } from "./split-row.js";
import {
	CARD_HEAD_COUNT,
	CARD_HEAD_ICON,
	CARD_HEAD_LOOK,
	CARD_HEAD_NAME,
	NESTED_ROWS,
} from "../../lib/tabs-look/tabs-look.js";
import { SidebarCard } from "../sidebar-card/sidebar-card.js";

export interface SplitEntryProps {
	readonly split: SidebarSplitState;
	readonly renaming: RowRenaming;
}

const HEAD_WORDS = "Split · {count}";
const HEAD_NAME = "Split";
const HEAD_SLOT = "cv:grid";

export function SplitEntry({ split, renaming }: SplitEntryProps): ReactElement | null {
	const focused = split.members.find((member) => member.isFocused) ?? split.members[0];

	if (focused === undefined) {
		return null;
	}

	const isOpen = split.isShown;
	const words = HEAD_WORDS.replace("{count}", String(split.members.length));
	return (
		<SidebarCard isOpen={isOpen} label={words} marks={{ "data-tabs-split": split.id }}>
			<div className={HEAD_SLOT}>
				<SwapLayer isShown={isOpen}>
					<div className={CARD_HEAD_LOOK} data-split-head="">
						<i className={CARD_HEAD_ICON} aria-hidden="true">
							<SplitMapIcon map={split.map} label={null} />
						</i>
						<span className={CARD_HEAD_NAME}>{HEAD_NAME}</span>
						<span className={CARD_HEAD_COUNT} data-card-count="">
							{split.members.length}
						</span>
					</div>
				</SwapLayer>
				<SwapLayer isShown={!isOpen}>
					<SplitRow split={split} focused={focused.item} />
				</SwapLayer>
			</div>
			<FoldBox isOpen={isOpen}>
				<div className={NESTED_ROWS} data-split-members="">
					{split.members.map((member) => (
						<SplitMemberRow key={rowFaceOf(member.item).id} member={member} splitId={split.id} renaming={renaming} />
					))}
				</div>
			</FoldBox>
		</SidebarCard>
	);
}
