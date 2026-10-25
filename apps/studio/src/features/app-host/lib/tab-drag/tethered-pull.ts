import { capturePointer, releasePointer, swallowNextClick } from "@widgetarium/behaviors";

export interface TetheredPullAsk {
	readonly holder: HTMLElement;
	readonly row: HTMLElement;
	readonly tabId: string;
	readonly pointerId: number;
	readonly start: readonly [number, number];
}

const DRAG_NAME = "held tab pull";
const STRETCH_MOST_PX = 22;
const STRETCH_SOFTNESS_PX = 70;
const HINT = "In another window";
const HINT_GAP_PX = 8;
const SNAP_BACK = "transform var(--sumi-dur-slow) cubic-bezier(0.34, 1.56, 0.64, 1)";
const HINT_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	zIndex: "2147483000",
	pointerEvents: "none",
	padding: "4px 8px",
	borderRadius: "8px",
	fontFamily: "var(--sumi-font-ui)",
	fontSize: "var(--sumi-fs-12)",
	whiteSpace: "nowrap",
	color: "var(--sumi-text)",
	background: "var(--sumi-plate)",
	boxShadow: "var(--sumi-shadow-pop)",
};

export function isHeldElsewhere(row: HTMLElement): boolean {
	return row.querySelector("[data-tabs-own-window]") !== null;
}

export class TetheredPull {
	private readonly hint: HTMLElement;

	constructor(private readonly ask: TetheredPullAsk) {
		this.hint = document.createElement("div");
		this.hint.textContent = HINT;
		this.hint.dataset["tabsHeldHint"] = "";
		Object.assign(this.hint.style, HINT_STYLE);
	}

	start(): void {
		const { holder, pointerId, row, tabId } = this.ask;
		capturePointer(holder, pointerId, DRAG_NAME);
		holder.addEventListener("pointermove", this.onMove);
		holder.addEventListener("pointerup", this.onEnd);
		holder.addEventListener("pointercancel", this.onEnd);
		row.style.transition = "none";
		document.body.append(this.hint);
		this.placeHint();
		console.info(`[widgetarium] tab drag of ${tabId} none → tethered (it stands in another window)`);
	}

	abandon(): void {
		this.onEnd();
	}

	private readonly onMove = (event: PointerEvent): void => {
		const [x, y] = this.ask.start;
		this.ask.row.style.transform = `translate(${stretchOf(event.clientX - x)}px, ${stretchOf(event.clientY - y)}px)`;
	};

	private readonly onEnd = (): void => {
		const { holder, pointerId, row, tabId } = this.ask;
		holder.removeEventListener("pointermove", this.onMove);
		holder.removeEventListener("pointerup", this.onEnd);
		holder.removeEventListener("pointercancel", this.onEnd);
		releasePointer(holder, pointerId);
		swallowNextClick(holder);
		row.style.transition = SNAP_BACK;
		row.style.transform = "";
		this.hint.remove();
		console.info(`[widgetarium] tab drag of ${tabId} tethered → resting (sprang back; it stays in its window)`);
	};

	private placeHint(): void {
		const box = this.ask.row.getBoundingClientRect();
		this.hint.style.left = `${box.left + HINT_GAP_PX}px`;
		this.hint.style.top = `${box.top - box.height + HINT_GAP_PX / 2}px`;
	}
}

function stretchOf(distance: number): number {
	return Math.sign(distance) * STRETCH_MOST_PX * (1 - Math.exp(-Math.abs(distance) / STRETCH_SOFTNESS_PX));
}
