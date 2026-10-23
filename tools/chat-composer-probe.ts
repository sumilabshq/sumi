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

export const FIELD_PARTS: Parts = {
	field: { board: ".cmp", built: ".wg-studio-ai-field", keys: FLAT },
	box: { board: ".ctext", built: ".wg-studio-ai-box", keys: ["pad", "minH", ...TEXT] },
	bar: { board: ".cbar", built: ".wg-studio-ai-field-bar", keys: ["h", "gap"] },
	plus: { board: ".plus", built: ".wg-studio-ai-plus", keys: [...BOX, "color"] },
	plusGlyph: { board: ".plus svg", built: ".wg-studio-ai-plus svg", keys: ["w", "h"] },
	strip: { board: ".strip", built: ".wg-studio-ai-strip", keys: ["h", "pad", "gap", "marginTop"] },
	stripButton: {
		board: ".sbt:not(.out):not(.hov)",
		built: ".wg-studio-ai-strip-button:not(.is-outlined)",
		keys: [...FLAT, ...TEXT],
	},
	stripChevron: { board: ".sbt .cv svg", built: ".wg-studio-ai-strip-button .wg-studio-ai-chevron svg", keys: ["w"] },
	usageTrack: {
		board: ".sbt svg circle:first-child",
		built: ".wg-studio-ai-usage-ring .is-track",
		keys: ["stroke", "strokeWidth"],
	},
	usageUsed: {
		board: ".sbt svg circle:last-child",
		built: ".wg-studio-ai-usage-ring .is-used",
		keys: ["stroke", "strokeWidth"],
	},
};

export const IDLE_PARTS: Parts = {
	sendIdle: { board: ".send.idle", built: ".wg-studio-ai-send.is-idle", keys: [...BOX, "color"] },
	barWords: { board: "text:.cbar", built: "text:.wg-studio-ai-field-bar", keys: [] },
};

export const TYPED_PARTS: Parts = {
	fieldFocused: { board: ".cmp.focus", built: ".wg-studio-ai-field.is-focused", keys: ["edge"] },
	sendReady: { board: ".send.ready", built: ".wg-studio-ai-send.is-typing", keys: [...BOX, "color"] },
	sendGlyph: { board: ".send.ready svg", built: ".wg-studio-ai-send.is-typing svg", keys: ["w", "h"] },
	hint: { board: ".hint > span", built: ".wg-studio-ai-hint", keys: ["gap", ...TEXT] },
	hintKey: { board: ".hint kbd", built: ".wg-studio-ai-hint kbd", keys: [...FLAT, "minW", "fs", "fw", "color"] },
	hintKeys: { board: "count:.hint kbd", built: "count:.wg-studio-ai-hint kbd", keys: [] },
	hintWords: { board: "text:.hint", built: "text:.wg-studio-ai-hint", keys: [] },
};

export const TIP_PARTS: Parts = {
	tip: { board: ".send .tip", built: ".wg-kit-tooltip.wg-studio-ai-tip", keys: [...FLAT, "fs", "fw", "color"] },
	tipKey: { board: ".send .tip kbd", built: ".wg-studio-ai-tip kbd", keys: [...FLAT, "fs", "color"] },
	tipWords: { board: "text:.send .tip", built: "text:.wg-studio-ai-tip", keys: [] },
};

export const CARD_PARTS: Parts = {
	row: { board: ".atrack", built: ".wg-studio-ai-attachments-track", keys: ["pad", "gap"] },
	rowBelow: { board: ".arow", built: ".wg-studio-ai-attachments", keys: ["marginBottom"] },
	file: {
		board: ".afile:not(.afolder)",
		built: ".wg-studio-ai-card.is-file[data-attachment-card=text]",
		keys: [...BOX],
	},
	folder: { board: ".afolder", built: "[data-attachment-card=folder]", keys: [...BOX] },
	image: { board: ".aim", built: ".wg-studio-ai-card.is-image", keys: ["h", "w", "radius"] },
	glyph: {
		board: ".afolder .fi",
		built: "[data-attachment-card=folder] .wg-studio-ai-card-glyph",
		keys: [...BOX, "color"],
	},
	name: { board: ".afolder .ft b", built: "[data-attachment-card=folder] .wg-studio-ai-card-words b", keys: TEXT },
	where: {
		board: ".afolder .ft span",
		built: "[data-attachment-card=folder] .wg-studio-ai-card-words span",
		keys: TEXT,
	},
	whereWords: {
		board: "text:.afolder .ft span",
		built: "text:[data-attachment-card=folder] .wg-studio-ai-card-words span",
		keys: [],
	},
	fileWords: {
		board: "text:.afile:not(.afolder) .ft span",
		built: "text:[data-attachment-card=text] .wg-studio-ai-card-words span",
		keys: [],
	},
};

export const REMOVE_PARTS: Parts = {
	ringed: { board: ".afolder.hovring", built: "[data-attachment-card=folder]", keys: ["edge", "inside"] },
	remove: {
		board: ".afolder .ax",
		built: "[data-attachment-card=folder] .wg-studio-ai-card-remove",
		keys: ["w", "h", "radius", "bg", "color", "top", "right", "inside"],
	},
};

export const REMOVE_LAST_PARTS: Parts = {
	ringedLast: { board: ".afile:not(.afolder).hovring", built: "[data-attachment-card=text]", keys: ["edge", "inside"] },
	removeLast: {
		board: ".afile:not(.afolder) .ax",
		built: "[data-attachment-card=text] .wg-studio-ai-card-remove",
		keys: ["w", "h", "bg", "top", "right", "inside"],
	},
};

export const MENU_PARTS: Parts = {
	menu: { board: "menu", built: "menu", keys: ["radius", "pad", "w", "bg", "edge"] },
	label: { board: "menu .mlabel", built: "menu .wg-studio-ai-menu-label", keys: ["pad", ...TEXT] },
	row: {
		board: "menu .mr.two:not(.sel):not(.hov)",
		built: "menu .wg-studio-ai-menu-row.is-two:not(.is-picked):not(:hover)",
		keys: [...FLAT, "fs", "fw", "color"],
	},
	small: { board: "menu .mr.two small", built: "menu .wg-studio-ai-menu-row.is-two small", keys: TEXT },
	picked: { board: "menu .mr.sel", built: "menu .wg-studio-ai-menu-row.is-picked", keys: ["h", "radius", "bg"] },
	tick: {
		board: "menu .mr.sel .mend svg",
		built: "menu .wg-studio-ai-menu-row.is-picked .wg-studio-ai-menu-end svg",
		keys: ["w", "color"],
	},
	rows: { board: "count:menu .mr", built: "count:menu .wg-studio-ai-menu-row", keys: [] },
	words: { board: "text:menu", built: "text:menu", keys: [] },
};

export const HOVER_ROW_PARTS: Parts = {
	hovered: { board: "menu .mr.hov", built: "menu .wg-studio-ai-menu-row:hover", keys: ["bg"] },
	openedButton: { board: ".sbt.hov", built: ".wg-studio-ai-strip-button.is-on", keys: ["bg", "color"] },
};

export const USAGE_PARTS: Parts = {
	meterHead: { board: "menu .meter .mh", built: "menu .wg-studio-ai-meter-head", keys: TEXT },
	meterBar: { board: "menu .meter .bar", built: "menu .wg-studio-ai-meter-bar", keys: ["h", "radius", "bg"] },
	meterFill: { board: "menu .meter .bar i", built: "menu .wg-studio-ai-meter-bar i", keys: ["bg"] },
	meterSmall: { board: "menu .meter small", built: "menu .wg-studio-ai-meter small", keys: TEXT },
	meter: { board: "menu .meter", built: "menu .wg-studio-ai-meter", keys: ["pad", "gap"] },
};

export const EMPTY_PARTS: Parts = {
	header: { board: "count:.pane .wg-studio-ai-head", built: "count:.wg-studio-ai-head", keys: [] },
	mascot: { board: ".pane .wg-mascot", built: ".wg-studio-ai-welcome .wg-mascot", keys: ["w", "h"] },
	greet: { board: ".pane .greet", built: ".wg-studio-ai-greet", keys: [...TEXT, "gapAbove"] },
	greetWords: { board: "text:.pane .greet", built: "text:.wg-studio-ai-greet", keys: [] },
	said: { board: ".pane .sub", built: ".wg-studio-ai-greet-said", keys: [...TEXT, "gapAbove"] },
	saidWords: { board: "text:.pane .sub", built: "text:.wg-studio-ai-greet-said", keys: [] },
	starters: { board: ".pane .starters", built: ".wg-studio-ai-starters", keys: ["gap"] },
	saidToStarters: {
		board: "between:.pane .sub|.pane .starters",
		built: "between:.wg-studio-ai-greet-said|.wg-studio-ai-starters",
		keys: [],
	},
	starter: { board: ".pane .st:not(.hov)", built: ".wg-studio-ai-starter:not(:hover)", keys: [...FLAT, "flexGap"] },
	starterIcon: { board: ".pane .st .si", built: ".wg-studio-ai-starter-icon", keys: [...BOX, "color"] },
	starterTitle: { board: ".pane .st b", built: ".wg-studio-ai-starter-words b", keys: TEXT },
	starterLine: { board: ".pane .st span.d", built: ".wg-studio-ai-starter-words span", keys: TEXT },
	starterWords: { board: "text:.pane .starters", built: "text:.wg-studio-ai-starters", keys: [] },
	folderButton: { board: ".pane .sbt.out", built: ".wg-studio-ai-strip-button.is-outlined", keys: [...FLAT, ...TEXT] },
	stripWords: { board: "text:.pane .strip", built: "text:.wg-studio-ai-strip", keys: [] },
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
		const menus = side === "board" ? [...document.querySelectorAll(".gm")] : [...document.querySelectorAll(".wg-studio-ai-menu")];
		return menus.find((menu) => menu.getClientRects().length > 0 && (window.__MENU_LABEL__ === undefined || (menu.querySelector(side === "board" ? ".mlabel" : ".wg-studio-ai-menu-label")?.textContent ?? "") === window.__MENU_LABEL__)) ?? null;
	};
	const within = (selector) => {
		if (selector.startsWith("menu")) {
			const menu = menuOf();
			if (!menu) return [];
			const rest = selector.slice(4).trim();
			return rest === "" ? [menu] : [...menu.querySelectorAll(rest)];
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
		const box = el.getBoundingClientRect();
		const radius = parseFloat(s.borderTopLeftRadius);
		const previous = el.previousElementSibling;
		return {
			h: Math.round(box.height * 2) / 2,
			w: Math.round(box.width * 2) / 2,
			minH: s.minHeight,
			minW: s.minWidth,
			radius: radius >= box.height / 2 - 0.5 && box.height > 0 ? "pill" : s.borderTopLeftRadius,
			pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(" "),
			gap: s.columnGap,
			flexGap: s.rowGap,
			margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].join(" "),
			marginTop: s.marginTop,
			marginBottom: s.marginBottom,
			bg: ownBg(s),
			edge: firstColour(s.boxShadow),
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
