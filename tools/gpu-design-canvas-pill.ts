import type { AskedPage } from "./chrome-ask.ts";
import type { Check } from "./gpu-design-canvas-probe.ts";

const PILL_LOOK = `(() => {
	const view = document.querySelector("[data-canvas-view]");
	const tone = (token) => {
		const probe = document.createElement("i");
		probe.style.background = "var(" + token + ")";
		view.append(probe);
		const painted = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return painted;
	};
	const paintedBy = (className) => {
		const probe = document.createElement("i");
		probe.className = className;
		view.append(probe);
		const painted = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return painted;
	};
	const lightnessOf = (color) => {
		const pen = document.createElement("canvas").getContext("2d");
		pen.fillStyle = color;
		pen.fillRect(0, 0, 1, 1);
		const [red, green, blue] = pen.getImageData(0, 0, 1, 1).data;
		return (red + green + blue) / 765;
	};
	const look = (node, pseudo) => {
		if (!node) return null;
		const style = getComputedStyle(node, pseudo);
		const box = node.getBoundingClientRect();
		return {
			width: Math.round(box.width),
			height: Math.round(box.height),
			isRound: parseFloat(style.borderTopLeftRadius) >= box.height / 2,
			radius: style.borderTopLeftRadius,
			fill: style.backgroundColor,
			ink: style.color,
			size: style.fontSize,
			case: style.textTransform,
			tracking: style.letterSpacing,
			text: node.textContent.trim(),
		};
	};
	const picked = document.querySelector("[data-canvas-page][data-picked]");
	const resting = document.querySelector("[data-canvas-page]:not([data-picked])");
	const blurred = [...view.querySelectorAll("*")].filter(
		(node) => getComputedStyle(node).backdropFilter !== "none" || getComputedStyle(node, "::before").backdropFilter !== "none",
	).length;
	return {
		tokens: { ink: tone("--primary"), onInk: tone("--primary-foreground"), raise: tone("--raise"), plate: tone("--group"), line: tone("--group-line"), brand: tone("--brand"), muted: tone("--muted-foreground"), radius: getComputedStyle(view).getPropertyValue("--radius").trim() },
		toggle: look(document.querySelector("[data-canvas-sidebar-toggle]")),
		togglePressed: document.querySelector("[data-canvas-sidebar-toggle]")?.getAttribute("aria-pressed"),
		close: look(document.querySelector("[data-host-close]")),
		closeLabel: document.querySelector("[data-host-close]")?.getAttribute("aria-label"),
		title: look(document.querySelector("[data-canvas-title]")),
		picture: look(document.querySelector("[data-canvas-title] [aria-label='Add photo']")),
		views: look(document.querySelector("[data-host-tabs]")),
		pickedView: look(document.querySelector("[data-host-tab][aria-selected=true]")),
		eyebrows: [...view.querySelectorAll("[data-canvas-eyebrow]")].map((node) => look(node)),
		sidebar: look(document.querySelector("[data-canvas-sidebar]")),
		plate: look(document.querySelector("[data-canvas-plate]")),
		hairline: look(document.querySelector("[data-canvas-layers] [role=separator]")),
		pickedPage: look(picked),
		pickedDot: look(picked?.querySelector("[data-canvas-page-dot]")),
		restingDot: look(resting?.querySelector("[data-canvas-page-dot]")),
		board: look(document.querySelector("[data-canvas-board]")),
		blurred,
		pageDot: paintedBy("cv:bg-page-dot"),
		pageDotStep: Math.abs(lightnessOf(paintedBy("cv:bg-page-dot")) - lightnessOf(tone("--raise"))),
	};
})()`;

interface Look {
	readonly width: number;
	readonly height: number;
	readonly isRound: boolean;
	readonly radius: string;
	readonly fill: string;
	readonly ink: string;
	readonly size: string;
	readonly case: string;
	readonly tracking: string;
	readonly text: string;
}

interface PillLook {
	readonly tokens: Readonly<
		Record<"ink" | "onInk" | "raise" | "plate" | "line" | "brand" | "muted" | "radius", string>
	>;
	readonly toggle: Look | null;
	readonly togglePressed: string | null;
	readonly close: Look | null;
	readonly closeLabel: string | null;
	readonly title: Look | null;
	readonly picture: Look | null;
	readonly views: Look | null;
	readonly pickedView: Look | null;
	readonly eyebrows: readonly Look[];
	readonly sidebar: Look | null;
	readonly plate: Look | null;
	readonly hairline: Look | null;
	readonly pickedPage: Look | null;
	readonly pickedDot: Look | null;
	readonly restingDot: Look | null;
	readonly board: Look | null;
	readonly blurred: number;
	readonly pageDot: string;
	readonly pageDotStep: number;
}

const ROUND_PX = 48;
const PICTURE_PX = 36;
const TAB_PX = 40;
const PAGE_ROW_PX = 36;
const EYEBROW_PX = "11px";
const EYEBROWS = ["Pages", "Layers"];
const LEAST_DOT_STEP = 0.1;

export async function checkPillChrome(page: AskedPage, check: Check): Promise<void> {
	const seen = await pillLook(page);
	for (const law of PILL_LAWS) {
		check(law.said, law.holds(seen), law.shown(seen));
	}
}

interface PillLaw {
	readonly said: string;
	readonly holds: (seen: PillLook) => boolean;
	readonly shown: (seen: PillLook) => unknown;
}

const PILL_LAWS: readonly PillLaw[] = [
	{
		said: "pill: the sidebar toggle is a round 48px ink button while the sidebar is open",
		holds: isInkToggle,
		shown: ({ toggle, togglePressed }) => ({ toggle, togglePressed }),
	},
	{
		said: "pill: Back to view is a round 48px raise button with a label and no text",
		holds: isRoundClose,
		shown: ({ close, closeLabel }) => ({ close, closeLabel }),
	},
	{
		said: "pill: the title is a 48px raise pill holding the page name",
		holds: isTitlePill,
		shown: ({ title }) => title,
	},
	{
		said: "pill: the add-picture button inside the title is a round 36px plate button",
		holds: ({ picture, tokens }) => isRoundOf(picture, PICTURE_PX) && picture?.fill === tokens.plate,
		shown: ({ picture }) => picture,
	},
	{
		said: "pill: the host's tabs are a 48px raise pill whose shown tab is a 40px ink fill with on-ink text",
		holds: isInkPickedView,
		shown: ({ views, pickedView }) => ({ views, pickedView }),
	},
	{
		said: "pill: the sidebar and the board stand on one raise plate with the plate radius, neither rounded on its own",
		holds: isOnePlate,
		shown: ({ plate, sidebar, board, tokens }) => ({ plate, sidebar, board, radius: tokens.radius }),
	},
	{
		said: "pill: Pages and Layers are 11px sentence-case muted eyebrows, a hairline between them",
		holds: areEyebrows,
		shown: ({ eyebrows, hairline }) => ({ eyebrows, hairline }),
	},
	{
		said: "pill: the current page sits on a 36px plate pill with a brand dot, the others on the page-dot token",
		holds: isCurrentPagePill,
		shown: ({ pickedPage, pickedDot, restingDot }) => ({ pickedPage, pickedDot, restingDot }),
	},
	{
		said: "pill: a resting page dot stands a visible step off the raise plate",
		holds: ({ pageDotStep }) => pageDotStep >= LEAST_DOT_STEP,
		shown: ({ pageDot, pageDotStep }) => ({ pageDot, pageDotStep }),
	},
	{
		said: "pill: no backdrop blur stands anywhere in the canvas chrome",
		holds: ({ blurred }) => blurred === 0,
		shown: ({ blurred }) => blurred,
	},
];

function isInkToggle({ toggle, togglePressed, tokens }: PillLook): boolean {
	return (
		isRoundOf(toggle, ROUND_PX) &&
		toggle?.fill === tokens.ink &&
		toggle.ink === tokens.onInk &&
		togglePressed === "true"
	);
}

function isRoundClose({ close, closeLabel, tokens }: PillLook): boolean {
	return (
		isRoundOf(close, ROUND_PX) && close?.fill === tokens.raise && close.text === "" && closeLabel === "Back to view"
	);
}

function isTitlePill({ title, tokens }: PillLook): boolean {
	return title?.height === ROUND_PX && title.isRound && title.fill === tokens.raise && title.text.length > 0;
}

function isInkPickedView({ views, pickedView, tokens }: PillLook): boolean {
	return (
		views?.height === ROUND_PX &&
		views.fill === tokens.raise &&
		pickedView?.height === TAB_PX &&
		pickedView.fill === tokens.ink &&
		pickedView.ink === tokens.onInk
	);
}

function isOnePlate({ plate, sidebar, board, tokens }: PillLook): boolean {
	return (
		plate?.fill === tokens.raise &&
		plate.radius === tokens.radius &&
		sidebar?.radius === "0px" &&
		board?.radius === "0px"
	);
}

function areEyebrows({ eyebrows, hairline, tokens }: PillLook): boolean {
	const isNamed = eyebrows.map((one) => one.text).join() === EYEBROWS.join();
	return (
		isNamed &&
		eyebrows.every((one) => isEyebrow(one, tokens.muted)) &&
		hairline?.height === 1 &&
		hairline.fill === tokens.line
	);
}

function isCurrentPagePill({ pickedPage, pickedDot, restingDot, pageDot, tokens }: PillLook): boolean {
	const isPill = pickedPage?.height === PAGE_ROW_PX && pickedPage.isRound && pickedPage.fill === tokens.plate;
	return isPill && pickedDot?.fill === tokens.brand && (restingDot === null || restingDot.fill === pageDot);
}

function isRoundOf(look: Look | null, px: number): boolean {
	return look !== null && look.width === px && look.height === px && look.isRound;
}

function isEyebrow(look: Look, muted: string): boolean {
	return (
		look.size === EYEBROW_PX &&
		look.case === "none" &&
		(look.tracking === "normal" || parseFloat(look.tracking) === 0) &&
		look.ink === muted
	);
}

async function pillLook(page: AskedPage): Promise<PillLook> {
	const asked: unknown = await page.ask(PILL_LOOK);
	if (!isPillLook(asked)) {
		throw new Error(`pill: no chrome read, got ${JSON.stringify(asked)}`);
	}

	return asked;
}

function isPillLook(value: unknown): value is PillLook {
	return typeof value === "object" && value !== null && "tokens" in value && "eyebrows" in value;
}
