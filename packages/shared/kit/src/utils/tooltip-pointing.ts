import {
	TOOLTIP_FADE_OUT_MS,
	TOOLTIP_HELD_AFTER_LEAVE_MS,
	TOOLTIP_HOSTED_DELAY_MS,
	TOOLTIP_SKIP_DELAY_MS,
} from "../constants/overlays";
import { TOOLTIP_MARK_NAMES, TOOLTIP_TARGET, tooltipSaidOf } from "./tooltip-marks";
import type { TooltipSaid } from "./tooltip-marks";

export type TooltipPhase = "shut" | "open" | "leaving";

export interface TooltipAnchor {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface TooltipState {
	readonly phase: TooltipPhase;
	readonly said: TooltipSaid | null;
	readonly previous: TooltipSaid | null;
	readonly anchor: TooltipAnchor | null;
	readonly isFresh: boolean;
	readonly serial: number;
}

const SHUT: TooltipState = {
	phase: "shut",
	said: null,
	previous: null,
	anchor: null,
	isFresh: true,
	serial: 0,
};
const NO_TIMER = 0;
const CAPTURED: AddEventListenerOptions = { capture: true };
const CAPTURED_PASSIVE: AddEventListenerOptions = { capture: true, passive: true };

type PageListen = <K extends keyof DocumentEventMap>(
	type: K,
	heard: (event: DocumentEventMap[K]) => void,
	options: AddEventListenerOptions,
) => () => void;

export class TooltipPointing {
	private state: TooltipState = SHUT;
	private readonly listeners = new Set<() => void>();
	private readonly drawers: symbol[] = [];
	private target: Element | null = null;
	private aimed: Element | null = null;
	private pressed: Element | null = null;
	private shownTimer = NO_TIMER;
	private leaveTimer = NO_TIMER;
	private fadeTimer = NO_TIMER;
	private shutAt = Number.NEGATIVE_INFINITY;
	private stopListening: (() => void) | null = null;
	private readonly watcher: MutationObserver;

	constructor(private readonly page: Document) {
		this.watcher = new MutationObserver(() => this.reread());
	}

	readonly now = (): TooltipState => this.state;

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	readonly isDrawnBy = (drawer: symbol): boolean => this.drawers[0] === drawer;

	hold(drawer: symbol): () => void {
		this.drawers.push(drawer);
		this.stopListening ??= this.listen();
		this.told();
		return () => {
			this.drawers.splice(this.drawers.indexOf(drawer), 1);
			if (this.drawers.length === 0) {
				this.stopListening?.();
				this.stopListening = null;
				this.shutNow();
			}

			this.told();
		};
	}

	private listen(): () => void {
		const on = listenerOn(this.page);
		const stops = [
			on("pointerover", (event) => this.pointedAt(event), CAPTURED),
			on("pointerout", (event) => this.pointerLeft(event), CAPTURED),
			on("pointerdown", (event) => this.pressedOn(event), CAPTURED),
			on("focusin", (event) => this.focused(event), CAPTURED),
			on("focusout", (event) => this.blurred(event), CAPTURED),
			on("keydown", (event) => this.keyPressed(event), CAPTURED),
			on("scroll", () => this.scrolled(), CAPTURED_PASSIVE),
			on("wheel", () => this.scrolled(), CAPTURED_PASSIVE),
		];
		return () => stops.forEach((stop) => stop());
	}

	private pointerLeft(event: PointerEvent): void {
		if (event.relatedTarget === null) {
			this.leftPage();
		}
	}

	private pressedOn(event: PointerEvent): void {
		this.pressed = this.targetOf(event.target);
		this.shutNow();
	}

	private blurred(event: FocusEvent): void {
		if (this.targetOf(event.target) === this.target && !this.target?.matches(":hover")) {
			this.left();
		}
	}

	private keyPressed(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			this.shutNow();
		}
	}

	private scrolled(): void {
		if (this.state.phase !== "shut") {
			this.shutNow();
		}
	}

	private targetOf(at: EventTarget | null): Element | null {
		return at instanceof Element ? at.closest(TOOLTIP_TARGET) : null;
	}

	private pointedAt(event: PointerEvent): void {
		if (event.pointerType === "touch") {
			return;
		}

		const found = this.targetOf(event.target);
		if (found === null) {
			this.leftPage();
			return;
		}

		if (found === this.aimed || found === this.pressed) {
			return;
		}

		this.entered(found);
	}

	private leftPage(): void {
		this.pressed = null;
		this.left();
	}

	private focused(event: FocusEvent): void {
		const found = this.targetOf(event.target);
		if (found === null || !found.matches(":focus-visible")) {
			return;
		}

		this.aimed = found;
		this.clearTimers();
		this.shown(found);
	}

	private entered(found: Element): void {
		this.pressed = null;
		this.aimed = found;
		this.clearTimers();
		const isWarm = this.state.phase !== "shut" || performance.now() - this.shutAt < TOOLTIP_SKIP_DELAY_MS;
		if (isWarm) {
			this.shown(found);
			return;
		}

		this.shownTimer = window.setTimeout(() => this.shown(found), TOOLTIP_HOSTED_DELAY_MS);
	}

	private left(): void {
		this.aimed = null;
		window.clearTimeout(this.shownTimer);
		this.shownTimer = NO_TIMER;
		if (this.state.phase !== "open" || this.leaveTimer !== NO_TIMER) {
			return;
		}

		this.leaveTimer = window.setTimeout(() => this.faded(), TOOLTIP_HELD_AFTER_LEAVE_MS);
	}

	private faded(): void {
		this.leaveTimer = NO_TIMER;
		this.wrote({
			...this.state,
			phase: "leaving",
		});
		this.fadeTimer = window.setTimeout(() => this.shutNow(), TOOLTIP_FADE_OUT_MS);
	}

	private shown(found: Element): void {
		this.shownTimer = NO_TIMER;
		const said = tooltipSaidOf(found);
		if (said === null || !found.isConnected) {
			return;
		}

		const opened = this.openedOn(found, said);
		this.watch(found);
		this.wrote(opened);
	}

	private openedOn(found: Element, said: TooltipSaid): TooltipState {
		const isFresh = this.state.phase === "shut";
		const isAnother = found !== this.target || !isSameSaid(said, this.state.said);
		return {
			phase: "open",
			said,
			previous: !isFresh && isAnother ? this.state.said : null,
			anchor: anchorOf(found),
			isFresh,
			serial: this.state.serial + 1,
		};
	}

	private reread(): void {
		const target = this.target;
		if (target === null || this.state.phase !== "open") {
			return;
		}

		if (!target.isConnected) {
			this.shutNow();
			return;
		}

		this.shown(target);
	}

	private watch(found: Element): void {
		if (found === this.target) {
			return;
		}

		this.watcher.disconnect();
		this.target = found;
		this.watcher.observe(found, {
			attributes: true,
			attributeFilter: TOOLTIP_MARK_NAMES,
		});
	}

	private shutNow(): void {
		this.clearTimers();
		this.watcher.disconnect();
		this.target = null;
		if (this.state.phase === "shut") {
			return;
		}

		this.shutAt = performance.now();
		this.wrote({
			...this.state,
			phase: "shut",
			previous: null,
		});
	}

	private clearTimers(): void {
		window.clearTimeout(this.shownTimer);
		window.clearTimeout(this.leaveTimer);
		window.clearTimeout(this.fadeTimer);
		this.shownTimer = NO_TIMER;
		this.leaveTimer = NO_TIMER;
		this.fadeTimer = NO_TIMER;
	}

	private wrote(next: TooltipState): void {
		this.state = next;
		this.told();
	}

	private told(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

// TRADE-OFF: one per document, held in a module map; the tooltip is one per window, whoever mounts it
const POINTING_OF_PAGE = new WeakMap<Document, TooltipPointing>();

export function tooltipPointingOf(page: Document): TooltipPointing {
	const kept = POINTING_OF_PAGE.get(page);
	if (kept !== undefined) {
		return kept;
	}

	const made = new TooltipPointing(page);
	POINTING_OF_PAGE.set(page, made);
	return made;
}

function anchorOf(target: Element): TooltipAnchor {
	const box = target.getBoundingClientRect();
	return {
		left: box.left,
		top: box.top,
		right: box.right,
		bottom: box.bottom,
	};
}

function isSameSaid(one: TooltipSaid | null, other: TooltipSaid | null): boolean {
	if (one === null || other === null) {
		return one === other;
	}

	return one.said === other.said && one.keys === other.keys && one.detail === other.detail;
}

function listenerOn(page: Document): PageListen {
	return (type, heard, options) => {
		page.addEventListener(type, heard, options);
		return () => page.removeEventListener(type, heard, options);
	};
}
