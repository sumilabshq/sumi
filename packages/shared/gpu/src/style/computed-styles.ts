import { copyStyle } from "./class-style.js";
import type { ClassStyle } from "./class-style.js";
import { overrideOfCascade } from "./cascade-overrides.js";
import type { CssRead, StyleOverride } from "./cascade-overrides.js";
import { CascadeProbe } from "./cascade-probe.js";
import type { ProbedElement } from "./cascade-probe.js";

const MOST_RESOLVED = 2000;

// TRADE-OFF: an element is resolved alone under one .wg-root, so a selector reaching through its real ancestors does not match
export class ComputedStyles {
	private readonly probe: CascadeProbe;
	private readonly overrides = new Map<string, StyleOverride>();
	private readonly bare = new Map<string, CssRead>();
	private merged = new WeakMap<ClassStyle, Map<string, ClassStyle>>();

	constructor(from: Element) {
		this.probe = new CascadeProbe(from);
	}

	styleOf(parsed: ClassStyle, element: ProbedElement): ClassStyle {
		const key = keyOf(element);
		const byElement = this.merged.get(parsed) ?? new Map<string, ClassStyle>();
		this.merged.set(parsed, byElement);
		const known = byElement.get(key);
		if (known) return known;
		const style = copyStyle(parsed);
		this.overrideOf(element, key)(style);
		byElement.set(key, style);
		return style;
	}

	clear(): void {
		this.overrides.clear();
		this.bare.clear();
		this.merged = new WeakMap();
	}

	dispose(): void {
		this.clear();
		this.probe.dispose();
	}

	private overrideOf(element: ProbedElement, key: string): StyleOverride {
		const known = this.overrides.get(key);
		if (known) return known;
		if (this.overrides.size >= MOST_RESOLVED) this.clear();
		const override = overrideOfCascade(this.probe.read(element), this.bareOf(element.tag));
		this.overrides.set(key, override);
		return override;
	}

	private bareOf(tag: string): CssRead {
		const known = this.bare.get(tag);
		if (known) return known;
		const bare = this.probe.readBare(tag);
		this.bare.set(tag, bare);
		return bare;
	}
}

function keyOf(element: ProbedElement): string {
	return JSON.stringify(element);
}
