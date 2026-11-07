import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { app } from "../packages/shared/data-framework/src/index.ts";
import {
	PinTabCommand,
	PlaceInViewCommand,
	PlaceTabCommand,
	PlacesModule,
	SidebarQuery,
} from "../packages/state/places/index.ts";
import type { Screen, TabsAsk } from "../packages/state/places/index.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import type { SidebarEntry, TabDrop, TabsSidebar } from "../packages/domain/app-host/index.ts";
import { arrangedSidebar } from "../apps/studio/src/features/app-host/lib/tab-drag/arranged-sidebar.ts";
import type { DragSource } from "../apps/studio/src/features/app-host/lib/tab-drag/drag-source.ts";
import { MAIN_WINDOW, placedTabsOf, placesLinkOf } from "./places-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const NO_SCREEN: Screen = {
	pages: [],
	isBrowserAvailable: false,
	canOpenOwnWindow: false,
	tabPanes: [],
	shownTabPaneId: null,
	tabTargetId: null,
	chatGroups: [],
	elsewhere: [],
	focusedChatId: null,
};

const AT: TabsAsk = {
	window: MAIN_WINDOW,
	view: "canvas",
	screen: NO_SCREEN,
};

const SEED = {
	tabs: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5", "tab-6"].map((id) => ({
		id,
		app: "canvas" as const,
		pageId: null,
		label: null,
	})),
	lists: {
		workspace: ["tab-1", "tab-2", "tab-3", "tab-4", "tab-5"].map((id) => ({
			kind: "tab" as const,
			id,
		})),
		chat: [
			{
				kind: "tab" as const,
				id: "tab-6",
			},
		],
	},
	shownId: "tab-1",
	minted: 6,
	closed: [],
};

interface Drag {
	readonly what: string;
	readonly pinned: readonly string[];
	readonly id: string;
	readonly isFromBlock: boolean;
	readonly drop: Extract<TabDrop, { kind: "list" }>;
}

console.info = () => undefined;

async function splitWindowOf(pinned: readonly string[]): Promise<StartedApp> {
	const window = app()
		.imports(PlacesModule({ over: placesLinkOf(new MemoryTabsGateway(placedTabsOf(SEED, ["chat"]))) }))
		.start();
	await window.send(PlaceInViewCommand, {
		at: AT,
		tabId: "tab-2",
		targetTabId: "tab-1",
		side: "right",
	});
	await window.send(PlaceInViewCommand, {
		at: AT,
		tabId: "tab-3",
		targetTabId: "tab-2",
		side: "bottom",
	});

	for (const id of pinned) {
		await window.send(PinTabCommand, {
			window: MAIN_WINDOW,
			id,
			isPinned: true,
		});
	}

	return window;
}

async function sidebarIn(window: StartedApp): Promise<TabsSidebar> {
	const read = await window.send(SidebarQuery, {
		at: AT,
		essentials: [],
	});

	if (!read.ok) {
		throw new Error(read.reason);
	}

	return read.output;
}

function shapeOf(sidebar: TabsSidebar): unknown {
	return Object.fromEntries(sidebar.sections.map((section) => [section.list, section.entries.map(entryShapeOf)]));
}

function entryShapeOf(entry: SidebarEntry): unknown {
	if (entry.kind === "split") {
		return entry.split.members.map((member) => `${member.item.tab.id}${member.isPinned ? "*" : ""}`);
	}

	if (entry.kind === "group") {
		return entry.group.items.map((item) => item.tab.id);
	}

	const marked = entry.splitMark ? "~" : "";
	return entry.children === undefined ? `${entry.tab.id}${marked}` : { [entry.tab.id]: entry.children.length };
}

function splitIdIn(sidebar: TabsSidebar): string | null {
	const block = sidebar.sections.flatMap((section) => section.entries).find((entry) => entry.kind === "split");
	return block?.kind === "split" ? block.split.id : null;
}

function sourceOf(sidebar: TabsSidebar, { id, isFromBlock, pinned }: Drag): DragSource {
	return {
		kind: "tab",
		id,
		groupId: null,
		splitId: isFromBlock ? splitIdIn(sidebar) : null,
		list: pinned.includes(id) && !isFromBlock ? "pinned" : "workspace",
		isChat: false,
	};
}

async function previewAndModelOf(drag: Drag): Promise<readonly [unknown, unknown]> {
	const window = await splitWindowOf(drag.pinned);
	const before = await sidebarIn(window);
	const preview = arrangedSidebar(before, {
		source: sourceOf(before, drag),
		drop: drag.drop,
		isLanding: true,
	});
	await window.send(PlaceTabCommand, {
		at: AT,
		id: drag.id,
		place: drag.drop,
	});
	return [shapeOf(preview), shapeOf(await sidebarIn(window))];
}

const DRAGS: readonly Drag[] = [
	{
		what: "a pinned member of a mixed split dragged from the block into Open, above the block",
		pinned: ["tab-1"],
		id: "tab-1",
		isFromBlock: true,
		drop: {
			kind: "list",
			list: "workspace",
			groupId: null,
			before: "chat",
		},
	},
	{
		what: "a pinned member of a mixed split dragged from its Pinned copy to the end of Open",
		pinned: ["tab-1"],
		id: "tab-1",
		isFromBlock: false,
		drop: {
			kind: "list",
			list: "workspace",
			groupId: null,
			before: null,
		},
	},
	{
		what: "a pinned member of a mixed split dragged from the block into Pinned",
		pinned: ["tab-4", "tab-1"],
		id: "tab-1",
		isFromBlock: true,
		drop: {
			kind: "list",
			list: "pinned",
			groupId: null,
			before: "tab-4",
		},
	},
	{
		what: "a pinned member of a mixed split dragged from its Pinned copy into a chat",
		pinned: ["tab-1"],
		id: "tab-1",
		isFromBlock: false,
		drop: {
			kind: "list",
			list: "chat",
			groupId: null,
			before: null,
		},
	},
	{
		what: "a pinned member of an all-pinned split dragged into Open",
		pinned: ["tab-1", "tab-2", "tab-3"],
		id: "tab-2",
		isFromBlock: true,
		drop: {
			kind: "list",
			list: "workspace",
			groupId: null,
			before: null,
		},
	},
	{
		what: "an unpinned member of a mixed split dragged into Pinned",
		pinned: ["tab-1"],
		id: "tab-3",
		isFromBlock: true,
		drop: {
			kind: "list",
			list: "pinned",
			groupId: null,
			before: null,
		},
	},
];

for (const drag of DRAGS) {
	const [preview, model] = await previewAndModelOf(drag);
	check(`${drag.what}: the preview is what places lands`, preview, model);
}

console.log(
	tally.failed
		? `tabs arrange vs places: ${tally.failed} check(s) failed`
		: "tabs arrange vs places: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
