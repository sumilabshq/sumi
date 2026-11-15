import { createElement as h, useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import type { SidebarSection as SidebarSectionData } from "@widgetarium/app-host/contract";
import { FoldBox } from "../fold-box/fold-box.js";
import { SidebarEntries } from "./sidebar-entries.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface SidebarSectionProps {
	readonly section: SidebarSectionData;
	readonly renaming: RowRenaming;
	readonly isShown: boolean;
	readonly last?: ReactNode;
}

const FOLD_ICON_PX = 12;
const HEAD =
	"wg-ws-section-head cv:cursor-default cv:border-0 cv:bg-transparent cv:text-start cv:[font:inherit] cv:outline-none cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]";
const FOLD_MARK = "wg-kit-icon is-ghost is-m wg-ws-section-fold cv:cursor-default";
const ROWS = "wg-ws-section-rows cv:min-h-(--sumi-h-row)";

export function SidebarSection({ section, renaming, isShown, last }: SidebarSectionProps): ReactElement {
	const [isOpen, setOpen] = useState(true);
	const rowsId = useId();
	const label = section.title;
	return (
		<FoldBox isOpen={isShown} movesWhileArranging>
			<section className="wg-ws-section" aria-label={label} data-ws-section={label}>
				<button
					type="button"
					className={isOpen ? HEAD : `${HEAD} is-shut`}
					aria-expanded={isOpen}
					aria-controls={rowsId}
					onClick={() => setOpen(!isOpen)}
					data-tabs-section={section.list}
				>
					<span className="wg-ws-section-label">{label}</span>
					<span className={FOLD_MARK} aria-hidden="true" data-tabs-fold="">
						<Icon name="chevron-down" size={FOLD_ICON_PX} />
					</span>
				</button>
				<FoldBox isOpen={isOpen}>
					<div id={rowsId} className={ROWS} data-tabs-list={section.list} data-tabs-in={section.list}>
						<SidebarEntries entries={section.entries} renaming={renaming} />
						{last}
					</div>
				</FoldBox>
			</section>
		</FoldBox>
	);
}
