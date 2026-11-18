import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
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
import { groups } from "@sumi/groups/contract";
import { arrangedSidebarOf, carriedOf } from "../../lib/arranged-sidebar.js";
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

const LEVEL_PX = 24;

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
	const placeGroup = useCommand(groups.actions.place);
	const sort = useSidebarSort({
		levelPx: LEVEL_PX,
		onDrop: (drop) => {
			const { placed } = arrangedSidebarOf(sidebar, drop.id, drop);

			if (placed === null) {
				console.info(`[widgetarium] sidebar drop of ${drop.id} ${drop.place} ${drop.targetId} skipped: no place for it`);
				return;
			}

			console.info(`[widgetarium] sidebar drop ${drop.id} ${drop.place} ${drop.targetId} → ${JSON.stringify(placed.to)}`);
			const placing =
				placed.kind === "group" ? placeGroup.run({ id: placed.id, to: placed.to }) : placeTab.run({ id: placed.id, to: placed.to });
			void placing.then((answer) => {
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
	const draggedId = sorting?.id ?? null;
	const aim = sorting === null || sorting.outside !== null ? null : sorting.aim;
	const section = useMemo(() => {
		const shown = draggedId === null ? sidebar : arrangedSidebarOf(sidebar, draggedId, aim).sidebar;
		return shown.sections.find((one) => one.list === list);
	}, [sidebar, draggedId, aim, list]);
	useFlipRows(menu, section);
	const rows = useMemo(
		() => section?.entries.map((entry) => entryOf(entry, { list, acts, draggedId, onMenu })),
		[section, list, acts, draggedId, onMenu],
	);
	const ghost = useMemo(() => {
		const carried = draggedId === null ? null : carriedOf(sidebar, draggedId);
		const tab = draggedId === null ? null : draggedItemOf(items, draggedId);

		if (carried?.node.kind === "group") {
			return (
				<SidebarMenu role="presentation">
					{entryOf(carried.node, { list, acts, draggedId: null, onMenu })}
				</SidebarMenu>
			);
		}

		return tab === null ? null : (
			<SidebarMenuButton size="sm" tabIndex={-1}>
				<TabIcons item={tab} />
				<span className="sumi-tabs-sidebar-title">{tabOf(tab).title}</span>
			</SidebarMenuButton>
		);
	}, [sidebar, items, draggedId, list, acts, onMenu]);

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
					{rows}
					{last}
				</SidebarMenu>
			) : null}
			{sorting === null || sorting.outside !== null || ghost === null ? null : (
				<SidebarDragGhost left={sorting.left} top={sorting.top} width={sorting.width}>
					{ghost}
				</SidebarDragGhost>
			)}
		</SidebarGroup>
	);
}

interface EntryLook {
	readonly list: string;
	readonly acts: TabActs;
	readonly draggedId: string | null;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

function entryOf(entry: SidebarEntry, { list, acts, draggedId, onMenu }: EntryLook): ReactNode {
	if (entry.kind === "group") {
		return (
			<GroupEntry
				key={entry.group.id}
				group={entry.group}
				list={list}
				acts={acts}
				draggedId={draggedId}
				depth={0}
				isLifted={false}
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
