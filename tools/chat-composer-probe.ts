export type PartKeys = readonly string[];

export interface Part {
	readonly board: string;
	readonly built: string;
	readonly keys: PartKeys;
}

export type Parts = Readonly<Record<string, Part>>;

const BOX: PartKeys = ["h", "w", "radius", "pad", "gap", "bg", "edge"];
const TEXT: PartKeys = ["fs", "fw", "lh", "color", "spacing"];
const FLAT: PartKeys = ["h", "radius", "pad", "gap", "bg", "edge"];

const AUTO_BUILT = '.wg-studio-ai-strip .wg-kit-btn[aria-label="Permission mode"]';
const PICK_KEYS: PartKeys = ["h", "radius", "bg", "edge", "border", "fs", "fw", "color"];
const PICK_BOARD = ".bar > .pick:nth-of-type(2)";
const MODEL_BUILT = '.wg-studio-ai-field-bar .wg-kit-btn[aria-label="Model"]';
const OPTION_BOARD = ".under .opt";
const OPTION_BUILT = '.wg-studio-ai-strip .wg-kit-btn[aria-label="Sandbox"]';

export const IDLE_PARTS: Parts = {
	field: {
		board: ".field",
		built: ".wg-studio-ai-field",
		keys: ["h", "radius", "pad", "gap", "bg", "edge", "border"],
	},
	placeholder: { board: ".text", built: ".wg-studio-ai-box", keys: ["fs", "fw", "lh"] },
	bar: { board: ".bar", built: ".wg-studio-ai-field-bar", keys: ["h", "gap"] },
	plus: { board: ".plus", built: ".wg-studio-ai-plus", keys: [...BOX, "border", "color"] },
	plusGlyph: { board: ".plus svg", built: ".wg-studio-ai-plus svg", keys: ["w", "h"] },
	model: { board: PICK_BOARD, built: MODEL_BUILT, keys: PICK_KEYS },
	mode: { board: ".under .opt:nth-of-type(3)", built: AUTO_BUILT, keys: ["fs", "fw", "color"] },
	usage: { board: ".usage", built: ".sumi-usage-button", keys: ["h", "w", "radius", "pad", "border"] },
	sendIdle: {
		board: ".send",
		built: ".wg-studio-ai-send.is-idle",
		keys: ["h", "w", "radius", "pad", "gap", "edge", "border", "color"],
	},
	sendGlyph: { board: ".send svg", built: ".wg-studio-ai-send.is-idle svg", keys: ["w", "h"] },
	option: { board: OPTION_BOARD, built: OPTION_BUILT, keys: ["fs", "fw", "color"] },
};

export const TYPED_PARTS: Parts = {
	typedText: { board: ".text", built: ".wg-studio-ai-box", keys: ["fs", "fw", "lh", "color"] },
	sendReady: { board: ".send.ready", built: ".wg-studio-ai-send.is-typing", keys: [...BOX, "border", "color"] },
	sendGlyph: { board: ".send.ready svg", built: ".wg-studio-ai-send.is-typing svg", keys: ["w", "h"] },
};

export const UNJUDGED = [
	"the model and effort buttons: the board draws one button, the build two that read as one, so their padding and gap are not compared",
	"the usage ring: the build keeps its 18px ring and the fill of a secondary button, the board draws 16px on --soft",
	"the idle send in dark: the build paints --active, a translucent fill the probe reads over white, so its dark background is not compared",
	"the option chevrons: the build hides them in the footer row and the board draws none",
	"the spacing under the field: the build stands the row on the field edges with a negative margin, the board pads it, so the two gaps are not compared",
	"the typing hints: the person moved ↵ send and ⇧↵ new line into the placeholder, so the field draws no hint row",
	"the tooltips: the person chose the studio's own gliding tooltip, with its arrow, over the board's plain tip",
	"the mascot's name: the boards still say Ink, the person renamed it Sumi, so board text is read with Sumi",
];

export const WORKING_PARTS: Parts = {
	stop: {
		board: ".send.ready",
		built: ".wg-studio-ai-send.is-streaming",
		keys: ["h", "w", "radius", "bg", "border"],
	},
	stopSquare: {
		board: ".send.ready > .stop",
		built: ".wg-studio-ai-stop-square",
		keys: ["h", "w", "radius", "bg"],
	},
};

const TEXT_CARD = "[data-attachment-card=text]";
const IMAGE_CARD = ".wg-studio-ai-card.is-image";

export const CARD_PARTS: Parts = {
	field: { board: ".composer", built: ".wg-studio-ai-field", keys: ["pad", "gap"] },
	row: { board: ".att", built: ".wg-studio-ai-attachments-track", keys: ["gap"] },
	firstCard: {
		board: ".att > :first-child",
		built: ".wg-studio-ai-attachments-track > :first-child",
		keys: ["fromField"],
	},
	rowToText: {
		board: "between:.att|.field",
		built: "between:.wg-studio-ai-attachments|.wg-studio-ai-box-frame",
		keys: [],
	},
	file: { board: ".doc", built: `.wg-studio-ai-card.is-file${TEXT_CARD}`, keys: [...BOX] },
	image: { board: ".img", built: IMAGE_CARD, keys: ["h", "w", "radius", "edge"] },
	glyph: { board: ".doc svg", built: `${TEXT_CARD} .wg-studio-ai-card-glyph svg`, keys: ["w", "h", "color"] },
	name: { board: ".doc .n", built: `${TEXT_CARD} .wg-studio-ai-card-words b`, keys: TEXT },
	size: { board: ".doc .s", built: `${TEXT_CARD} .wg-studio-ai-card-words span`, keys: TEXT },
	nameWords: { board: "text:.doc .n", built: `text:${TEXT_CARD} .wg-studio-ai-card-words b`, keys: [] },
	sizeWords: { board: "text:.doc .s", built: `text:${TEXT_CARD} .wg-studio-ai-card-words span`, keys: [] },
};

export const REMOVE_PARTS: Parts = {
	ringed: { board: ".img:has(.x)", built: IMAGE_CARD, keys: ["edge"] },
	remove: {
		board: ".img .x",
		built: `${IMAGE_CARD} .wg-studio-ai-card-remove`,
		keys: ["w", "h", "radius", "bg", "edge", "color", "top", "right"],
	},
	removeGlyph: { board: ".img .x svg", built: `${IMAGE_CARD} .wg-studio-ai-card-remove svg`, keys: ["w", "h"] },
};

const PICKED_BUILT = 'menu .wg-kit-pop-item[aria-checked="true"]';

export const MENU_PARTS: Parts = {
	menu: { board: "menu", built: "menu", keys: ["radius", "pad", "w", "bg", "edge"] },
	label: { board: "menu .mh", built: "menu :is(.wg-kit-menu-label, .sumi-pane-head)", keys: ["pad", ...TEXT] },
	row: {
		board: "menu .mi:has(.d):not(.sel):not(.hov)",
		built: 'menu .wg-kit-pop-item.is-two:not([aria-checked="true"]):not(:hover)',
		keys: [...FLAT, ...TEXT],
	},
	small: { board: "menu .mi .d", built: "menu .wg-kit-pop-sub", keys: TEXT },
	picked: { board: "menu .mi.sel", built: PICKED_BUILT, keys: ["h", "radius", "pad", "bg"] },
	tick: { board: "menu .mi.sel .chk", built: `${PICKED_BUILT} .wg-kit-pop-tick`, keys: ["w", "h", "color"] },
	hovered: { board: "menu .mi.hov", built: "menu .wg-kit-pop-item:hover", keys: ["bg"] },
};

export const ATTACH_PARTS: Parts = {
	menu: { board: "menu", built: "menu", keys: ["radius", "pad", "w", "bg", "edge"] },
	row: {
		board: "menu .mi:not(.hov)",
		built: "menu .wg-studio-ai-menu-row:not(:hover)",
		keys: ["h", "radius", "pad", "gap", "bg", ...TEXT],
	},
	icon: { board: "menu .mi .ic", built: "menu .wg-studio-ai-menu-mark svg", keys: ["w", "h", "color"] },
	hovered: { board: "menu .mi.hov", built: "menu .wg-studio-ai-menu-row:hover", keys: ["bg"] },
};

export const USAGE_PARTS: Parts = {
	label: { board: "menu > div:first-child", built: "menu .wg-kit-menu-label", keys: ["fs", "fw", "color"] },
	head: { board: "menu > div:nth-child(2)", built: "menu .sumi-usage-meter-head", keys: ["fs", "fw", "color"] },
	headValue: {
		board: "menu > div:nth-child(2) > span:last-child",
		built: "menu .sumi-usage-meter-head span",
		keys: ["fs", "color"],
	},
	bar: { board: "menu .bar", built: "menu .sumi-usage-meter-bar", keys: ["h", "radius", "bg", "margin"] },
	fill: { board: "menu .bar span", built: "menu .sumi-usage-meter-bar i", keys: ["bg"] },
	small: { board: "menu > div:nth-child(4)", built: "menu .sumi-usage-meter small", keys: ["fs", "color"] },
};

const WELCOME_BOARD = "sc-if > div:has(> h1)";

export const EMPTY_PARTS: Parts = {
	welcome: { board: WELCOME_BOARD, built: ".wg-studio-ai-welcome", keys: ["pad", "gap"] },
	mascot: {
		board: `${WELCOME_BOARD} > svg.m`,
		built: ".wg-studio-ai-welcome .wg-mascot",
		keys: ["w", "h", "marginBottom"],
	},
	greet: { board: `${WELCOME_BOARD} > h1`, built: ".wg-studio-ai-greet", keys: [...TEXT, "margin", "gapAbove"] },
	greetWords: { board: `text:${WELCOME_BOARD} > h1`, built: "text:.wg-studio-ai-greet", keys: [] },
	said: { board: `${WELCOME_BOARD} > p`, built: ".wg-studio-ai-greet-said", keys: [...TEXT, "margin", "gapAbove"] },
	saidWords: { board: `text:${WELCOME_BOARD} > p`, built: "text:.wg-studio-ai-greet-said", keys: [] },
	starters: {
		board: `${WELCOME_BOARD} > div`,
		built: ".wg-studio-ai-starters",
		keys: ["w", "gap", "marginTop", "gapAbove"],
	},
	starter: { board: `${WELCOME_BOARD} .card`, built: ".wg-studio-ai-starter", keys: ["radius", "pad", "bg"] },
	starterIcon: { board: `${WELCOME_BOARD} .card svg`, built: ".wg-studio-ai-starter-icon", keys: ["w", "h", "color"] },
	starterTitle: { board: `${WELCOME_BOARD} .card > span:first-of-type`, built: ".wg-studio-ai-starter", keys: TEXT },
	starterTitleWords: {
		board: `text:${WELCOME_BOARD} .card > span:first-of-type`,
		built: "text:.wg-studio-ai-starter",
		keys: [],
	},
	usageRing: { board: 'button[aria-label^="Usage"] svg', built: ".sumi-usage-ring", keys: ["w", "h"] },
	usageTrack: {
		board: 'button[aria-label^="Usage"] circle:first-child',
		built: ".sumi-usage-ring .is-track",
		keys: ["stroke", "strokeWidth"],
	},
	usageUsed: {
		board: 'button[aria-label^="Usage"] circle:last-child',
		built: ".sumi-usage-ring .is-used",
		keys: ["stroke", "strokeWidth"],
	},
};

export const PART_PROBE = `((scope, parts, side) => {
	const nth = /^nth:([0-9]+):(.*)$/.exec(scope);
	const root = scope === "" ? document : nth ? document.querySelectorAll(nth[2])[Number(nth[1])] : document.querySelector(scope);
	if (!root) return { missing: scope };
	const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	const rgb = (colour) => {
		if (!colour || colour === "none") return null;
		pen.clearRect(0, 0, 1, 1);
		pen.fillStyle = "#fff";
		pen.fillRect(0, 0, 1, 1);
		pen.fillStyle = "#000";
		pen.fillStyle = colour;
		pen.fillRect(0, 0, 1, 1);
		const [r, g, b] = pen.getImageData(0, 0, 1, 1).data;
		return [r, g, b];
	};
	const firstColour = (text) => {
		const found = /(oklch|oklab|rgba?|color|lab|lch)\\([^)]*\\)/.exec(text || "");
		return found ? rgb(found[0]) : null;
	};
	const ownBg = (s) => (s.backgroundColor === "rgba(0, 0, 0, 0)" ? null : rgb(s.backgroundColor));
	const menuOf = () => {
		const asked = window.__MENU_LABEL__ === undefined ? null : window.__MENU_LABEL__[side];
		if (side === "board") return document.querySelector(\`.menu[aria-label="\${asked}"]\`);
		const menus = [...document.querySelectorAll(".wg-kit-pop.is-open")];
		return menus.find((menu) => menu.getClientRects().length > 0 && (asked === null || (menu.querySelector(".wg-kit-menu-label, .wg-studio-ai-menu-label, .sumi-pane-head > span")?.textContent ?? "") === asked)) ?? null;
	};
	const within = (selector) => {
		if (selector.startsWith("menu")) {
			const menu = menuOf();
			if (!menu) return [];
			const rest = selector.slice(4).trim();
			return rest === "" ? [menu] : [...menu.querySelectorAll(rest.startsWith(">") ? ":scope " + rest : rest)];
		}
		return [...root.querySelectorAll(selector)];
	};
	const shown = (selector) => within(selector).filter((el) => el.getClientRects().length > 0);
	const words = (el) => (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim();
	const clipOf = (el) => {
		let clip = el.parentElement;
		while (clip && !/(auto|hidden|scroll|clip)/.test(getComputedStyle(clip).overflowX)) clip = clip.parentElement;
		return clip;
	};
	const outerSpread = (shadow) => (shadow || "").split(/,(?![^(]*\\))/).filter((one) => !one.includes("inset")).map((one) => (one.match(/-?[0-9.]+px/g) || []).map(parseFloat)).map((lengths) => lengths.length >= 4 ? lengths[3] + Math.max(Math.abs(lengths[0]), Math.abs(lengths[1])) : 0).reduce((most, one) => Math.max(most, one), 0);
	const isInside = (el, s, box) => {
		const clip = clipOf(el);
		if (!clip) return true;
		const edge = clip.getBoundingClientRect();
		const spread = outerSpread(s.boxShadow);
		return box.left - spread >= edge.left - 0.5 && box.top - spread >= edge.top - 0.5 && box.right + spread <= edge.right + 0.5 && box.bottom + spread <= edge.bottom + 0.5;
	};
	const looks = (el) => {
		const s = getComputedStyle(el);
		const paint = el.matches(".wg-kit-pop-item, .wg-kit-btn, .wg-kit-icon") ? getComputedStyle(el, "::before") : s;
		const box = el.getBoundingClientRect();
		const radius = parseFloat(paint.borderTopLeftRadius);
		const previous = el.previousElementSibling;
		return {
			h: Math.round(box.height * 2) / 2,
			w: Math.round(box.width * 2) / 2,
			minH: s.minHeight,
			minW: s.minWidth,
			radius: radius >= box.height / 2 - 0.5 && box.height > 0 ? "pill" : paint.borderTopLeftRadius,
			pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(" "),
			gap: s.columnGap,
			flexGap: s.rowGap,
			margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].join(" "),
			marginTop: s.marginTop,
			marginBottom: s.marginBottom,
			bg: ownBg(paint),
			edge: firstColour(s.boxShadow),
			border: s.borderTopStyle === "none" || parseFloat(s.borderTopWidth) === 0 ? null : [s.borderTopWidth, rgb(s.borderTopColor)],
			opacity: s.opacity,
			color: rgb(s.color),
			stroke: rgb(s.stroke),
			strokeWidth: s.strokeWidth,
			fs: s.fontSize,
			fw: s.fontWeight,
			lh: s.lineHeight,
			spacing: s.letterSpacing,
			top: s.top,
			right: s.right,
			gapAbove: previous ? Math.round(box.top - previous.getBoundingClientRect().bottom) : null,
			fromField: (() => {
				const field = el.closest(".composer, .wg-studio-ai-field");
				if (!field) return null;
				const edge = field.getBoundingClientRect();
				return [Math.round(box.left - edge.left), Math.round(box.top - edge.top)];
			})(),
			inside: isInside(el, s, box),
		};
	};
	const out = {};
	for (const [name, part] of Object.entries(parts)) {
		const selector = part[side];
		if (selector.startsWith("count:")) {
			out[name] = shown(selector.slice(6)).length;
			continue;
		}
		if (selector.startsWith("between:")) {
			const [above, below] = selector.slice(8).split("|").map((one) => shown(one)[0]);
			out[name] = above && below ? Math.round(below.getBoundingClientRect().top - above.getBoundingClientRect().bottom) : "missing";
			continue;
		}
		if (selector.startsWith("text:")) {
			const el = shown(selector.slice(5))[0];
			out[name] = el ? words(el) : null;
			continue;
		}
		const el = shown(selector)[0];
		if (!el) {
			out[name] = "missing";
			continue;
		}
		const all = looks(el);
		out[name] = Object.fromEntries(part.keys.map((key) => [key, all[key]]));
	}
	return out;
})`;
