import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import {
	DropRefusal,
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
import type { TabActs } from "@sumi/tab-strip-plugin";
import { groups } from "@sumi/groups/contract";
import { arrangedSidebarOf, carriedOf } from "../../lib/arranged-sidebar.js";
import { refusedDropOf } from "../../lib/drop-refusals.js";
import { splitItemOf, tabItemOf } from "../../lib/entry-items.js";
import { GroupEntry } from "../group-entry/group-entry.js";
import { SplitEntry } from "../split-entry/split-entry.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface SidebarSectionProps {
	readonly list: string;
	readonly sidebar: TabsSidebar;
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
	const placeSplit = useCommand(appHost.splits.placeSplit);
	const sort = useSidebarSort({
		levelPx: LEVEL_PX,
		onDrop: (drop) => {
			const { placed, holder } = arrangedSidebarOf(sidebar, drop.id, drop);
			const refused = refusedDropOf(sidebar, carriedOf(sidebar, drop.id), holder);

			if (refused !== null) {
				console.info(`[widgetarium] sidebar drop of ${drop.id} onto ${refused.anchorId} skipped: ${refused.words}`);
				return;
			}

			if (placed === null) {
				console.info(`[widgetarium] sidebar drop of ${drop.id} ${drop.place} ${drop.targetId} skipped: no place for it`);
				return;
			}

			console.info(`[widgetarium] sidebar drop ${drop.id} ${drop.place} ${drop.targetId} → ${JSON.stringify(placed.to)}`);
			const placing =
				placed.kind === "group"
					? placeGroup.run({ id: placed.id, to: placed.to })
					: placed.kind === "split"
						? placeSplit.run({ id: placed.id, to: placed.to })
						: placeTab.run({ id: placed.id, to: placed.to });
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
	const arranged = useMemo(() => (draggedId === null ? null : arrangedSidebarOf(sidebar, draggedId, aim)), [sidebar, draggedId, aim]);
	const refused = useMemo(
		() => (draggedId === null || arranged === null ? null : refusedDropOf(sidebar, carriedOf(sidebar, draggedId), arranged.holder)),
		[sidebar, draggedId, arranged],
	);
	const section = useMemo(
		() => (arranged === null || refused !== null ? sidebar : arranged.sidebar).sections.find((one) => one.list === list),
		[sidebar, arranged, refused, list],
	);
	useFlipRows(menu, section);
	const rows = useMemo(
		() => section?.entries.map((entry) => entryOf(entry, { list, acts, draggedId, onMenu })),
		[section, list, acts, draggedId, onMenu],
	);
	const ghost = useMemo(() => {
		const carried = draggedId === null ? null : carriedOf(sidebar, draggedId);

		if (carried === null) {
			return null;
		}

		if (carried.node.kind !== "tab" || (carried.node.subPages?.length ?? 0) > 0) {
			return (
				<SidebarMenu role="presentation">
					{entryOf(carried.node, { list, acts, draggedId: null, onMenu })}
				</SidebarMenu>
			);
		}

		const tab = tabItemOf(carried.node.tab, list);
		return (
			<SidebarMenuButton size="sm" tabIndex={-1}>
				<TabIcons item={tab} />
				<span className="sumi-tabs-sidebar-title">{tabOf(tab).title}</span>
			</SidebarMenuButton>
		);
	}, [sidebar, draggedId, list, acts, onMenu]);

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
			{refused === null ? null : (
				<DropRefusal
					anchor={menu.current?.querySelector<HTMLElement>(`[data-sort-id="${CSS.escape(refused.anchorId)}"]`) ?? null}
					words={refused.words}
				/>
			)}
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
				subPages={entry.subPages}
				isFolded={entry.isFolded}
				draggedId={draggedId}
				onMenu={onMenu}
			/>
		);
	}

	const item = splitItemOf(entry.split, list);
	return item === null ? null : (
		<SplitEntry key={entry.split.id} item={item} acts={acts} draggedId={draggedId} onMenu={onMenu} />
	);
}
