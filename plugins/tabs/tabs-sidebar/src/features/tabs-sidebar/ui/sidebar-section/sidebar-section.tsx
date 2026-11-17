import { createElement as h, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import {
	SidebarDragGhost,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuChevron,
	useFlipRows,
	useSidebarSort,
} from "@widgetarium/kit";
import type { SidebarSorting, SidebarSortOutside } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { SidebarEntry, TabsSidebar } from "@widgetarium/app-host/contract";
import { TabIcons, tabOf } from "@sumi/tab-strip-plugin";
import type { StripItem, TabActs } from "@sumi/tab-strip-plugin";
import { arrangedSidebarOf } from "../../lib/arranged-sidebar.js";
import { draggedItemOf } from "../../lib/dragged-item.js";
import { splitItemOf, tabItemOf } from "../../lib/entry-items.js";
import { GroupEntry } from "../group-entry/group-entry.js";
import { SplitEntry } from "../split-entry/split-entry.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface SidebarSectionProps {
	readonly list: string;
	readonly sidebar: TabsSidebar;
	readonly items: readonly StripItem[];
	readonly acts: TabActs;
	readonly last: ReactNode;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
	onSorting(sorting: SidebarSorting | null): void;
	onDropOutside(outside: SidebarSortOutside): void;
}

export function SidebarSection({
	list,
	sidebar,
	items,
	acts,
	last,
	onMenu,
	onSorting,
	onDropOutside,
}: SidebarSectionProps): ReactElement | null {
	const [isOpen, setOpen] = useState(true);
	const menu = useRef<HTMLElement | null>(null);
	const placeTab = useCommand(appHost.tabs.placeTab);
	const sort = useSidebarSort({
		onDrop: (drop) => {
			const { placed } = arrangedSidebarOf(sidebar, drop.id, drop);

			if (placed === null) {
				console.info(`[widgetarium] sidebar drop of ${drop.id} ${drop.place} ${drop.targetId} skipped: no place for it`);
				return;
			}

			console.info(`[widgetarium] sidebar drop ${drop.id} ${drop.place} ${drop.targetId} → ${JSON.stringify(placed.to)}`);
			void placeTab.run(placed).then((answer) => {
				if (!answer.ok) {
					console.warn(`[widgetarium] sidebar drop of ${drop.id} refused: ${answer.reason}`);
				}
			});
		},
		onDropOutside,
	});
	const { sorting } = sort;
	const latestOnSorting = useRef(onSorting);
	latestOnSorting.current = onSorting;
	useEffect(() => latestOnSorting.current(sorting), [sorting]);
	useFlipRows(menu);
	const shown =
		sorting === null || sorting.outside !== null ? sidebar : arrangedSidebarOf(sidebar, sorting.id, sorting.aim).sidebar;
	const section = shown.sections.find((one) => one.list === list);
	const draggedId = sorting?.id ?? null;
	const dragged = draggedId === null ? null : draggedItemOf(items, draggedId);

	if (section === undefined) {
		return null;
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel asChild>
				<button type="button" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
					<span>{section.title}</span>
					<SidebarMenuChevron isOpen={isOpen} />
				</button>
			</SidebarGroupLabel>
			{isOpen ? (
				<SidebarMenu
					ref={menu}
					role="tablist"
					aria-orientation="vertical"
					aria-label={section.title}
					onPointerDown={sort.onPointerDown}
				>
					{section.entries.map((entry) => entryOf(entry, list, acts, draggedId, onMenu))}
					{last}
				</SidebarMenu>
			) : null}
			{sorting === null || sorting.outside !== null || dragged === null ? null : (
				<SidebarDragGhost left={sorting.left} top={sorting.top} width={sorting.width}>
					<SidebarMenuButton size="sm" tabIndex={-1}>
						<TabIcons item={dragged} />
						<span className="sumi-tabs-sidebar-title">{tabOf(dragged).title}</span>
					</SidebarMenuButton>
				</SidebarDragGhost>
			)}
		</SidebarGroup>
	);
}

function entryOf(
	entry: SidebarEntry,
	list: string,
	acts: TabActs,
	draggedId: string | null,
	onMenu: (id: string, event: MouseEvent<HTMLElement>) => void,
): ReactNode {
	if (entry.kind === "group") {
		return (
			<GroupEntry
				key={entry.group.id}
				group={entry.group}
				list={list}
				acts={acts}
				draggedId={draggedId}
				onMenu={onMenu}
			/>
		);
	}

	if (entry.kind === "tab") {
		return (
			<TabEntry
				key={entry.tab.id}
				item={tabItemOf(entry.tab, list)}
				acts={acts}
				isSub={false}
				isPlaceholder={entry.tab.id === draggedId}
				onMenu={onMenu}
			/>
		);
	}

	const item = splitItemOf(entry.split, list);
	return item === null ? null : (
		<SplitEntry key={entry.split.id} item={item} acts={acts} draggedId={draggedId} onMenu={onMenu} />
	);
}
