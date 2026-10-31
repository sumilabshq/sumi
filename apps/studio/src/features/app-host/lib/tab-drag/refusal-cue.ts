import { cardOrRowOf } from "./sidebar-measure.js";

const SAID = "A chat can't hold a chat";
const SVG_NS = "http://www.w3.org/2000/svg";
const VEIL_BLUR = "blur(3px)";
const VEIL_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	zIndex: "2147482000",
	pointerEvents: "none",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: "8px",
	background: "color-mix(in srgb, var(--sumi-frame) 78%, transparent)",
	backdropFilter: VEIL_BLUR,
	fontFamily: "var(--sumi-font-ui)",
	fontSize: "var(--sumi-fs-13)",
	fontWeight: "500",
	whiteSpace: "nowrap",
	color: "var(--sumi-text-2)",
	opacity: "0",
	transition: "opacity var(--sumi-dur-base) var(--sumi-ease-out)",
};

export class RefusalCue {
	private readonly veil: HTMLElement;
	private refused: HTMLElement | null = null;
	private frame = 0;

	constructor() {
		this.veil = veilOf(SAID);
		document.body.append(this.veil);
	}

	point(row: HTMLElement | null): void {
		if (row === null) {
			this.hide();
			return;
		}

		this.refused = row;
		this.veil.hidden = false;
		this.veil.style.opacity = "1";
		this.follow();
	}

	remove(): void {
		cancelAnimationFrame(this.frame);
		this.veil.remove();
	}

	private follow(): void {
		cancelAnimationFrame(this.frame);
		const row = this.refused;

		if (row === null || !row.isConnected) {
			return;
		}

		const target = cardOrRowOf(row);
		const box = target.getBoundingClientRect();
		Object.assign(this.veil.style, {
			left: `${box.left}px`,
			top: `${box.top}px`,
			width: `${box.width}px`,
			height: `${box.height}px`,
			borderRadius: getComputedStyle(target).borderRadius,
		});
		this.frame = requestAnimationFrame(() => this.follow());
	}

	private hide(): void {
		if (this.refused === null) {
			return;
		}

		cancelAnimationFrame(this.frame);
		this.refused = null;
		this.veil.style.opacity = "0";
		this.veil.addEventListener(
			"transitionend",
			() => {
				this.veil.hidden = this.refused === null;
			},
			{ once: true },
		);
	}
}

function veilOf(text: string): HTMLElement {
	const veil = document.createElement("div");
	veil.setAttribute("role", "status");
	veil.hidden = true;
	veil.dataset["tabsRefusalHint"] = "";
	Object.assign(veil.style, VEIL_STYLE);
	veil.style.setProperty("-webkit-backdrop-filter", VEIL_BLUR);
	const words = document.createElement("span");
	words.textContent = text;
	veil.append(noEntryGlyph(), words);
	return veil;
}

function noEntryGlyph(): SVGElement {
	const glyph = document.createElementNS(SVG_NS, "svg");
	glyph.setAttribute("width", "16");
	glyph.setAttribute("height", "16");
	glyph.setAttribute("viewBox", "0 0 24 24");
	glyph.setAttribute("fill", "none");
	glyph.setAttribute("stroke", "currentColor");
	glyph.setAttribute("stroke-width", "2");
	glyph.setAttribute("aria-hidden", "true");
	const ring = document.createElementNS(SVG_NS, "circle");
	ring.setAttribute("cx", "12");
	ring.setAttribute("cy", "12");
	ring.setAttribute("r", "9");
	const slash = document.createElementNS(SVG_NS, "path");
	slash.setAttribute("d", "m5.6 5.6 12.8 12.8");
	glyph.append(ring, slash);
	return glyph;
}
