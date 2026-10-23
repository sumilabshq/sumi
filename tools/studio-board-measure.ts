export type Look = Readonly<Record<string, string>>;

export const LOOK_PROPS = [
	"left",
	"top",
	"width",
	"height",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"columnGap",
	"rowGap",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"letterSpacing",
	"lineHeight",
	"color",
	"opacity",
	"border",
	"background",
	"radius",
	"shadow",
	"paintWidth",
	"paintHeight",
	"bothPaint",
] as const;

export type LookProp = (typeof LOOK_PROPS)[number];

export const LOOKS_OF = `((asked) => {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const pen = canvas.getContext("2d", { willReadFrequently: true });
	const colourOf = (said) => {
		pen.clearRect(0, 0, 1, 1);
		pen.fillStyle = "rgba(0, 0, 0, 0)";
		pen.fillStyle = said;
		pen.fillRect(0, 0, 1, 1);
		const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
		return a === 0 ? "none" : "rgba(" + r + "," + g + "," + b + "," + Math.round((a / 255) * 100) / 100 + ")";
	};
	const COLOUR = /(?:rgba?|oklch|oklab|lab|lch|color|hsla?)\\([^)]*\\)|#[0-9a-fA-F]{3,8}\\b/g;
	const shadowOf = (said) => {
		if (said === "none" || said === "") return "none";
		const layers = said.split(/,(?![^(]*\\))/).map((layer) => layer.replace(COLOUR, (one) => colourOf(one)).replace(/\\s+/g, " ").trim());
		const drawn = layers.filter((layer) => !/(^|\\s)none(\\s|$)/.test(layer));
		return drawn.length === 0 ? "none" : drawn.join(" | ");
	};
	const px = (said) => String(Math.round(parseFloat(said) * 10) / 10 || 0) + "px";
	const familyOf = (said) => (said.split(",")[0] ?? "").replace(/["']/g, "").replace(/ Variable$/, "").trim();
	const paints = (style) => colourOf(style.backgroundColor) !== "none" || shadowOf(style.boxShadow) !== "none" || (style.backgroundImage ?? "none") !== "none";
	const out = {};
	for (const [name, selector] of Object.entries(asked)) {
		const found = document.querySelector(selector);
		if (!found) { out[name] = null; continue; }
		const own = getComputedStyle(found);
		const sizeOf = (side) => found instanceof HTMLElement ? found[side === "width" ? "offsetWidth" : "offsetHeight"] : own[side].endsWith("px") ? parseFloat(own[side]) : box[side];
		const skin = getComputedStyle(found, "::before");
		const box = found.getBoundingClientRect();
		const skinPaints = skin.content !== "none" && skin.content !== "normal" && skin.display !== "none" && paints(skin);
		const ownPaints = paints(own);
		const plate = skinPaints ? skin : own;
		const borderWide = parseFloat(own.borderTopWidth) || 0;
		const lineHeight = own.lineHeight === "normal" ? "normal" : px(own.lineHeight);
		let opacity = 1;
		for (let at = found; at !== null && at instanceof Element; at = at.parentElement) opacity *= Number(getComputedStyle(at).opacity);
		out[name] = {
			left: px(box.left),
			top: px(box.top),
			width: px(sizeOf("width")),
			height: px(sizeOf("height")),
			paddingTop: px(own.paddingTop),
			paddingRight: px(own.paddingRight),
			paddingBottom: px(own.paddingBottom),
			paddingLeft: px(own.paddingLeft),
			columnGap: own.columnGap === "normal" ? "0px" : px(own.columnGap),
			rowGap: own.rowGap === "normal" ? "0px" : px(own.rowGap),
			fontFamily: familyOf(own.fontFamily),
			fontSize: px(own.fontSize),
			fontWeight: String(Number(own.fontWeight)),
			letterSpacing: own.letterSpacing === "normal" ? "0px" : px(own.letterSpacing),
			lineHeight,
			color: colourOf(own.color),
			opacity: String(Math.round(opacity * 100) / 100),
			border: borderWide === 0 || own.borderTopStyle === "none" ? "none" : px(own.borderTopWidth) + " " + colourOf(own.borderTopColor),
			background: colourOf(plate.backgroundColor),
			radius: plate === own && colourOf(own.backgroundColor) === "none" && shadowOf(own.boxShadow) === "none" ? "unpainted" : px(plate.borderTopLeftRadius),
			shadow: shadowOf(plate.boxShadow),
			paintWidth: skinPaints ? px(skin.width) : px(sizeOf("width")),
			paintHeight: skinPaints ? px(skin.height) : px(sizeOf("height")),
			bothPaint: String(skinPaints && ownPaints),
		};
	}
	return out;
})`;

const PX_SLACK = 0.6;
const CHANNEL_SLACK = 3;
const ALPHA_SLACK = 0.02;
const LENGTH = /^-?[\d.]+px$/;
const RGBA = /^rgba\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)$/;

export function isSameLook(wanted: string, drawn: string): boolean {
	if (wanted === drawn) {
		return true;
	}

	if (LENGTH.test(wanted) && LENGTH.test(drawn)) {
		return Math.abs(parseFloat(wanted) - parseFloat(drawn)) <= PX_SLACK;
	}

	return isSameColour(wanted, drawn) || isSameShadow(wanted, drawn);
}

function isSameColour(wanted: string, drawn: string): boolean {
	const one = RGBA.exec(wanted);
	const other = RGBA.exec(drawn);
	if (one === null || other === null) {
		return false;
	}

	const channels = [1, 2, 3].every((at) => Math.abs(Number(one[at]) - Number(other[at])) <= CHANNEL_SLACK);
	return channels && Math.abs(Number(one[4]) - Number(other[4])) <= ALPHA_SLACK;
}

function isSameShadow(wanted: string, drawn: string): boolean {
	const wantedLayers = wanted.split(" | ");
	const drawnLayers = drawn.split(" | ");
	if (wantedLayers.length !== drawnLayers.length || wantedLayers.length < 1 || wanted === "none") {
		return false;
	}

	return wantedLayers.every((layer, at) => isSameShadowLayer(layer, drawnLayers[at] ?? ""));
}

function isSameShadowLayer(wanted: string, drawn: string): boolean {
	const wantedParts = wanted.match(/rgba\([^)]*\)|inset|-?[\d.]+px/g) ?? [];
	const drawnParts = drawn.match(/rgba\([^)]*\)|inset|-?[\d.]+px/g) ?? [];
	if (wantedParts.length !== drawnParts.length) {
		return false;
	}

	return wantedParts.every((part, at) => {
		const other = drawnParts[at] ?? "";
		return part === other || (LENGTH.test(part) && isSameLook(part, other)) || isSameColour(part, other);
	});
}
