import type {
	Measured,
	MeasuredGrid,
	MeasuredHead,
	MeasuredList,
	MeasuredPart,
	MeasuredRow,
	MeasuredSplit,
	MeasuredUnit,
	Rect,
	SidebarLayout,
} from "./sidebar-layout.js";

type SplitFound = Pick<MeasuredSplit, "anchorId" | "parts" | "members">;

const LIFTED_HOLDER = "data-tabs-lifted-holder";
export const ROW_WRAPPER = "[data-tabs-lifted-holder], [data-tabs-card]";
const GROUP_ROWS_AT = ":scope > [data-fold-box] > * > [data-tabs-rows]";
const GROUP_ROWS = `${GROUP_ROWS_AT} > [data-tabs-item="tab"], ${GROUP_ROWS_AT} > :is(${ROW_WRAPPER}) > [data-tabs-item="tab"]`;
const SPLIT_PARTS = `[data-split-members] > :not(${ROW_WRAPPER}), [data-split-members] > :is(${ROW_WRAPPER}) > *`;
const SHUT_FOLD = "[data-fold-box]:not([data-open])";

const NOWHERE: Rect = {
	left: 0,
	top: 0,
	width: 0,
	height: 0,
};

export function measuredLayoutOf(holder: HTMLElement): SidebarLayout {
	const scroller = holder.querySelector<HTMLElement>("[data-host-column-scroll]");
	const lists = [...holder.querySelectorAll<HTMLElement>("[data-tabs-list]")].flatMap((element) =>
		measuredListsOf(holder, element),
	);
	const units = lists.flatMap((list) => list.units);
	return {
		grid: measuredGridOf(holder.querySelector<HTMLElement>("[data-tabs-essentials]")),
		scroller,
		scrollerRect: rectOrNullOf(scroller) ?? NOWHERE,
		scrollTop: scroller?.scrollTop ?? 0,
		lists,
		units,
	};
}

export function rectOf(element: Element): Rect {
	const box = element.getBoundingClientRect();
	return {
		left: box.left,
		top: box.top,
		width: box.width,
		height: box.height,
	};
}

export function contentStartOf(element: HTMLElement): number {
	return parseFloat(getComputedStyle(element).paddingInlineStart) || 0;
}

export function cardOrRowOf(row: HTMLElement): HTMLElement {
	const card = row.parentElement;

	if (card === null || !card.hasAttribute("data-tabs-card")) {
		return row;
	}

	return card;
}

function measuredOf(found: Iterable<HTMLElement>): readonly Measured[] {
	return [...found].flatMap((element) => {
		const id = element.dataset["tabsId"];
		return id === undefined
			? []
			: [
					{
						id,
						element,
						rect: rectOf(element),
					},
				];
	});
}

function measuredRowsOf(found: Iterable<HTMLElement>): readonly MeasuredRow[] {
	return measuredOf(found).map((row) => ({
		...row,
		isChat: row.element.dataset["tabsChat"] !== undefined,
		isFolded: row.element.querySelector("[data-tabs-fold][data-folded]") !== null,
		cardRect: rectOf(cardOrRowOf(row.element)),
	}));
}

function measuredGridOf(element: HTMLElement | null): MeasuredGrid {
	if (element === null) {
		return {
			element,
			rect: NOWHERE,
			tiles: [],
		};
	}

	return {
		element,
		rect: rectOf(element),
		tiles: measuredOf(element.querySelectorAll<HTMLElement>('[data-tabs-item="essential"]')),
	};
}

function measuredListsOf(holder: HTMLElement, element: HTMLElement): readonly MeasuredList[] {
	const id = element.dataset["tabsList"];

	if (id === undefined || element.closest(SHUT_FOLD) !== null) {
		return [];
	}

	return [
		{
			id,
			isNested: element.dataset["tabsNested"] !== undefined,
			rect: rectOf(element),
			head: measuredHeadOf(holder, id),
			units: [...element.children].flatMap((child) => unitsOf(child)),
		},
	];
}

function measuredHeadOf(holder: HTMLElement, listId: string): MeasuredHead | null {
	const head = holder.querySelector<HTMLElement>(`[data-tabs-section="${CSS.escape(listId)}"]`);

	if (head === null) {
		return null;
	}

	return {
		element: head,
		rect: rectOf(head),
	};
}

function rectOrNullOf(element: Element | null): Rect | null {
	return element === null ? null : rectOf(element);
}

function unitsOf(child: Element): readonly MeasuredUnit[] {
	if (!(child instanceof HTMLElement)) {
		return [];
	}

	if (child.dataset["tabsCard"] !== undefined || child.hasAttribute(LIFTED_HOLDER)) {
		return [...child.children].flatMap((inner) => unitsOf(inner));
	}

	return elementUnitsOf(child);
}

function elementUnitsOf(child: HTMLElement): readonly MeasuredUnit[] {
	const boxId = child.dataset["tabsBox"];
	const splitId = child.dataset["tabsSplit"];

	if (splitId !== undefined) {
		return measuredSplitOf(child, splitId);
	}

	if (boxId === undefined) {
		return measuredRowsOf([child]).map((row) => ({
			...row,
			kind: "tab",
		}));
	}

	return [measuredGroupOf(child, boxId)];
}

function measuredGroupOf(box: HTMLElement, id: string): MeasuredUnit {
	const head = box.querySelector<HTMLElement>('[data-tabs-item="group"]');
	const isOpen = head?.getAttribute("aria-expanded") === "true";
	return {
		kind: "group",
		id,
		element: box,
		rect: rectOf(box),
		head: rectOf(head ?? box),
		rows: isOpen ? measuredRowsOf(box.querySelectorAll<HTMLElement>(GROUP_ROWS)) : [],
		isOpen,
		holdsChat: box.hasAttribute("data-tabs-holds-chat"),
	};
}

function measuredSplitOf(block: HTMLElement, id: string): readonly MeasuredUnit[] {
	const parts = measuredPartsOf(block);
	const anchorId = parts.find((part) => part.id !== null)?.id ?? null;
	const members = block.querySelector("[data-split-members]");

	if (anchorId === null || members === null) {
		return [];
	}

	return [
		splitUnitAt(block, id, {
			anchorId,
			parts,
			members: rectOf(members),
		}),
	];
}

function measuredPartsOf(block: HTMLElement): readonly MeasuredPart[] {
	return [...block.querySelectorAll<HTMLElement>(SPLIT_PARTS)].map((element) => ({
		id: element.dataset["tabsId"] ?? null,
		element,
		rect: rectOf(element),
	}));
}

function splitUnitAt(block: HTMLElement, id: string, found: SplitFound): MeasuredUnit {
	return {
		kind: "split",
		id,
		...found,
		element: block,
		rect: rectOf(block),
		isOpen: block.hasAttribute("data-open"),
	};
}
