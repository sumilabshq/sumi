import type { ClassStyle, PaintStyle } from "../style/class-style.js";
import type { Animated, GpuContext } from "../engine/gpu-context.js";
import { colourOf } from "../style/gpu-tokens.js";
import type { Rgba } from "../style/gpu-tokens.js";

export type ColourPart = keyof PaintStyle;
type Colours = Readonly<Record<ColourPart, Rgba | null>>;

export interface ColourOwner {
	readonly context: GpuContext;
	markPaintDirty(): void;
}

interface Interaction {
	readonly hovered: boolean;
	readonly pressed: boolean;
}

interface Transition {
	readonly from: Colours;
	readonly to: Colours;
	readonly start: number;
	readonly duration: number;
}

const PARTS: readonly ColourPart[] = ["bg", "border", "text"];
const NO_COLOURS: Colours = { bg: null, border: null, text: null };

export class NodeColours implements Animated {
	current: Colours = NO_COLOURS;
	private transition: Transition | null = null;

	constructor(private readonly owner: ColourOwner) {}

	retarget(style: ClassStyle, interaction: Interaction, snap: boolean): void {
		const target = this.targetOf(style, interaction);
		const aimedAt = this.transition?.to ?? this.current;
		if (PARTS.every((part) => sameColour(target[part], aimedAt[part]))) return;
		this.owner.markPaintDirty();
		if (snap || style.transitionMs === 0) {
			this.current = target;
			this.transition = null;
			this.owner.context.animating.delete(this);
			return;
		}
		this.transition = { from: this.current, to: target, start: performance.now(), duration: style.transitionMs };
		this.owner.context.animating.add(this);
	}

	advance(now: number): boolean {
		const { transition } = this;
		if (!transition) return false;
		const progress = Math.min(1, (now - transition.start) / transition.duration);
		const eased = 1 - (1 - progress) ** 3;
		const textSnaps = !transition.from.text || !transition.to.text;
		this.current = {
			bg: mix(transition.from.bg, transition.to.bg, eased),
			border: mix(transition.from.border, transition.to.border, eased),
			text: textSnaps ? transition.to.text : mix(transition.from.text, transition.to.text, eased),
		};
		this.owner.markPaintDirty();
		if (progress < 1) return true;
		this.current = transition.to;
		this.transition = null;
		return false;
	}

	dispose(): void {
		this.owner.context.animating.delete(this);
	}

	private targetOf(style: ClassStyle, { hovered, pressed }: Interaction): Colours {
		const { tokens } = this.owner.context;
		const pick = (part: ColourPart): Rgba | null => {
			const word = (pressed ? style.active[part] : undefined) ?? (hovered ? style.hover[part] : undefined);
			const chosen = word ?? style.paint[part];
			return chosen ? colourOf(tokens, chosen) : null;
		};
		return { bg: pick("bg"), border: pick("border"), text: pick("text") };
	}
}

function mix(from: Rgba | null, to: Rgba | null, amount: number): Rgba | null {
	const known = to ?? from;
	if (!known) return null;
	const clear: Rgba = [known[0], known[1], known[2], 0];
	const [r0, g0, b0, a0] = from ?? clear;
	const [r1, g1, b1, a1] = to ?? clear;
	return [r0 + (r1 - r0) * amount, g0 + (g1 - g0) * amount, b0 + (b1 - b0) * amount, a0 + (a1 - a0) * amount];
}

function sameColour(a: Rgba | null, b: Rgba | null): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return a.every((value, at) => Math.abs(value - (b[at] ?? 0)) < 1e-4);
}
