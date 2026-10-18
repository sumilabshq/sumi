import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

interface PlateSeen {
	readonly plate: { readonly left: number; readonly right: number; readonly fill: string; readonly radius: string };
	readonly sidebar: { readonly left: number; readonly right: number; readonly fill: string; readonly radius: string };
	readonly board: { readonly left: number; readonly right: number };
	readonly hairline: { readonly left: number; readonly width: number; readonly fill: string } | null;
	readonly line: string;
	readonly sidebarState: string | null;
}

const PLATE_SEEN = `(() => {
	const plate = document.querySelector("[data-canvas-plate]");
	const sidebar = document.querySelector("[data-canvas-sidebar]");
	const board = document.querySelector("[data-canvas-board]");
	const edge = document.querySelector("[data-canvas-sidebar-edge]");
	const probe = document.createElement("i");
	probe.style.background = "var(--group-line)";
	plate.append(probe);
	const line = getComputedStyle(probe).backgroundColor;
	probe.remove();
	const boxOf = (node) => {
		const box = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return { left: box.left, right: box.right, fill: style.backgroundColor, radius: style.borderTopLeftRadius };
	};
	const hairlineOf = () => {
		const drawn = getComputedStyle(edge, "::before");
		return { left: edge.getBoundingClientRect().left + parseFloat(drawn.left), width: parseFloat(drawn.width), fill: drawn.backgroundColor };
	};
	const boardBox = board.getBoundingClientRect();
	return {
		plate: boxOf(plate),
		sidebar: boxOf(sidebar),
		board: { left: boardBox.left, right: boardBox.right },
		hairline: edge ? hairlineOf() : null,
		line,
		sidebarState: sidebar.dataset.canvasSidebar ?? null,
	};
})()`;
const TOGGLE = `document.querySelector("[data-canvas-sidebar-toggle]").click()`;
const HAIRLINE_PX = 1;
const SETTLE_TRIES = 30;
const SETTLE_MS = 100;
const TRANSPARENT = "rgba(0, 0, 0, 0)";

export async function checkOnePlate(page: AskedPage, check: Check): Promise<void> {
	const open = await plateSettled(page, "open");
	check(
		"plate: the sidebar and the board share one plate, the sidebar flush to its left edge with no fill or corner of its own",
		isSharedPlate(open),
		open,
	);
	check(
		"plate: no gap stands between the sidebar and the board, only the 1px hairline",
		isNear(open.board.left - open.sidebar.right, HAIRLINE_PX) && isNear(open.board.right, open.plate.right),
		{ sidebar: open.sidebar, board: open.board, plate: open.plate },
	);
	check("plate: the hairline is 1px of the group-line token, on the sidebar's right edge", isTokenHairline(open), {
		hairline: open.hairline,
		line: open.line,
		sidebarRight: open.sidebar.right,
	});
	await page.ask(TOGGLE);
	const folded = await plateSettled(page, "shut");
	check(
		"plate: folded, no hairline stands and the board takes the whole plate",
		folded.hairline === null &&
			isNear(folded.board.left, folded.plate.left) &&
			isNear(folded.board.right, folded.plate.right),
		folded,
	);
	await page.ask(TOGGLE);
	await plateSettled(page, "open");
}

function isSharedPlate({ plate, sidebar }: PlateSeen): boolean {
	return (
		plate.fill !== TRANSPARENT &&
		parseFloat(plate.radius) > 0 &&
		sidebar.fill === TRANSPARENT &&
		sidebar.radius === "0px" &&
		isNear(sidebar.left, plate.left)
	);
}

function isTokenHairline({ hairline, line, sidebar }: PlateSeen): boolean {
	return (
		hairline !== null &&
		hairline.width === HAIRLINE_PX &&
		hairline.fill === line &&
		line !== TRANSPARENT &&
		isNear(hairline.left, sidebar.right)
	);
}

async function plateSettled(page: AskedPage, sidebarState: string): Promise<PlateSeen> {
	for (let tries = 0; tries < SETTLE_TRIES; tries += 1) {
		const seen = await plateSeen(page);
		if (seen.sidebarState === sidebarState) {
			return seen;
		}

		await waited(SETTLE_MS);
	}
	return plateSeen(page);
}

async function plateSeen(page: AskedPage): Promise<PlateSeen> {
	const asked: unknown = await page.ask(PLATE_SEEN);
	if (!isPlateSeen(asked)) {
		throw new Error(`plate: nothing read, got ${JSON.stringify(asked)}`);
	}

	return asked;
}

function isPlateSeen(value: unknown): value is PlateSeen {
	return typeof value === "object" && value !== null && "plate" in value && "sidebar" in value && "board" in value;
}

function isNear(px: number, wanted: number): boolean {
	return Math.abs(px - wanted) <= 0.5;
}
