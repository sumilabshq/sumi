import { createElement as h, useId, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { SidebarSection as SidebarSectionData } from "@widgetarium/app-host";
import { SidebarEntries } from "./sidebar-entries.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface SidebarSectionProps {
	readonly section: SidebarSectionData;
	readonly renaming: RowRenaming;
}

const SECTION_LABELS: Readonly<Record<SidebarSectionData["list"], string>> = {
	pinned: "Pinned",
	workspace: "Open",
};
const FOLD = "Fold {label}";
const FOLD_ICON_PX = 12;
const ROWS = "wg-ws-section-rows cv:min-h-1";

export function SidebarSection({ section, renaming }: SidebarSectionProps): ReactElement {
	const [isOpen, setOpen] = useState(true);
	const rowsId = useId();
	const label = SECTION_LABELS[section.list];
	return (
		<section className="wg-ws-section" aria-label={label} data-ws-section={label}>
			<div className={`wg-ws-section-head${isOpen ? "" : " is-shut"}`} data-tabs-section={section.list}>
				<IconButton
					variant="ghost"
					className="wg-ws-section-fold"
					aria-expanded={isOpen}
					aria-controls={rowsId}
					label={FOLD.replace("{label}", label)}
					onClick={() => setOpen(!isOpen)}
					data-tabs-fold=""
				>
					<Icon name="chevron-down" size={FOLD_ICON_PX} />
				</IconButton>
				<span className="wg-ws-section-label">{label}</span>
			</div>
			<div id={rowsId} className={ROWS} hidden={!isOpen} data-tabs-list={section.list} data-tabs-in={section.list}>
				<SidebarEntries entries={section.entries} renaming={renaming} />
			</div>
		</section>
	);
}
