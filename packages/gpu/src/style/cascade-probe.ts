import { CASCADE_COLOURS, CASCADE_PROPERTIES } from "./cascade-overrides.js";
import { colourReaderOf } from "./painted-colour.js";
import type { ColourReader } from "./painted-colour.js";
import { PROBE_SCOPE } from "./tokens-from-document.js";
import type { CssRead } from "./cascade-overrides.js";
import { writeInlineStyle } from "./inline-style.js";
import type { InlineStyle } from "./inline-style.js";
import { writeAttributes } from "./probed-attributes.js";
import type { ProbedAttributes } from "./probed-attributes.js";

export interface ProbedElement {
	readonly tag: string;
	readonly className: string;
	readonly inline: InlineStyle | null;
	readonly attributes: ProbedAttributes;
	readonly group: ProbedElement | null;
}

const SCOPE_CLASS = "wg-root";
const NO_ATTRIBUTES: ProbedAttributes = {};

export class CascadeProbe {
	private readonly scope: HTMLElement;
	private readonly readColour: ColourReader;

	constructor(from: Element) {
		this.scope = from.ownerDocument.createElement("div");
		this.scope.className = SCOPE_CLASS;
		this.scope.style.display = "none";
		this.scope.setAttribute("aria-hidden", "true");
		this.scope.setAttribute(PROBE_SCOPE, "");
		this.readColour = colourReaderOf(from.ownerDocument);
		from.appendChild(this.scope);
	}

	read(element: ProbedElement): CssRead {
		const probe = this.mirrorOf(element);
		const placed = element.group ? this.wrappedIn(element.group, probe) : probe;
		this.scope.appendChild(placed);
		try {
			return this.snapshotOf(getComputedStyle(probe));
		} finally {
			placed.remove();
		}
	}

	readBare(tag: string): CssRead {
		return this.read({ tag, className: "", inline: null, attributes: NO_ATTRIBUTES, group: null });
	}

	dispose(): void {
		this.scope.remove();
	}

	private wrappedIn(group: ProbedElement, probe: HTMLElement): HTMLElement {
		const wrapper = this.mirrorOf(group);
		wrapper.appendChild(probe);
		return wrapper;
	}

	private mirrorOf(element: ProbedElement): HTMLElement {
		const mirror = this.scope.ownerDocument.createElement(element.tag);
		mirror.className = element.className;
		writeInlineStyle(mirror, element.inline);
		writeAttributes(mirror, element.attributes);
		return mirror;
	}

	private snapshotOf(computed: CSSStyleDeclaration): CssRead {
		const values = new Map(CASCADE_PROPERTIES.map((property) => [property, computed.getPropertyValue(property)]));
		for (const property of CASCADE_COLOURS) values.set(property, this.srgbOf(values.get(property) ?? ""));
		return (property) => values.get(property) ?? "";
	}

	private srgbOf(css: string): string {
		if (css === "") return css;
		const rgba = this.readColour(css);
		return rgba ? `color(srgb ${rgba[0]} ${rgba[1]} ${rgba[2]} / ${rgba[3]})` : css;
	}
}
