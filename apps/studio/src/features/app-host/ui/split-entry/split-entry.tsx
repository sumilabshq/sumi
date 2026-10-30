import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarSplitState } from "@widgetarium/app-host";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { SplitMapIcon } from "../split-map/split-map-icon.js";
import { FoldBox } from "../fold-box/fold-box.js";
import { SplitMemberRow } from "./split-member-row.js";
import { SplitRow } from "./split-row.js";

export interface SplitEntryProps {
	readonly split: SidebarSplitState;
	readonly renaming: RowRenaming;
}

const HEAD_WORDS = "Split · {count}";
const BLOCK =
	"cv:relative cv:my-0.5 cv:flex cv:flex-none cv:flex-col cv:rounded-[12px] cv:transition-[background-color,padding] cv:duration-(--sumi-dur-base) cv:ease-(--sumi-ease-out) cv:motion-reduce:transition-none cv:data-[open]:bg-(--sumi-plate) cv:data-[open]:px-0.5 cv:data-[open]:pt-0.5 cv:data-[open]:pb-1";
const HEAD =
	"cv:flex cv:h-[30px] cv:items-center cv:gap-2 cv:px-2 cv:text-[12px] cv:whitespace-nowrap cv:text-(--sumi-text-2)";
const ROWS =
	"cv:flex cv:flex-col cv:gap-px cv:[&_[data-shown]]:bg-(--sumi-active) cv:[&_[data-shown]]:hover:bg-(--sumi-active)";

export function SplitEntry({ split, renaming }: SplitEntryProps): ReactElement | null {
	const focused = split.members.find((member) => member.isFocused) ?? split.members[0];

	if (focused === undefined) {
		return null;
	}

	const isOpen = split.isShown;
	const words = HEAD_WORDS.replace("{count}", String(split.members.length));
	return (
		<div className={BLOCK} data-open={isOpen || undefined} data-tabs-split={split.id} role="group" aria-label={words}>
			<FoldBox isOpen={isOpen}>
				<div className={HEAD} data-split-head="">
					<SplitMapIcon map={split.map} label={null} />
					<span>{words}</span>
				</div>
			</FoldBox>
			<FoldBox isOpen={!isOpen}>
				<SplitRow split={split} focused={focused.item} />
			</FoldBox>
			<FoldBox isOpen={isOpen}>
				<div className={ROWS} data-split-members="">
					{split.members.map((member) => (
						<SplitMemberRow key={rowFaceOf(member.item).id} member={member} renaming={renaming} />
					))}
				</div>
			</FoldBox>
		</div>
	);
}
