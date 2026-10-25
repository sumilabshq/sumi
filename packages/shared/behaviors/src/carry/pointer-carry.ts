import { muteTextSelection } from "../held-drag/held-pointer.js";
import { announceCarry } from "./carry.js";
import type { CarriedItem, CarryPhase } from "./carry.js";

export interface PointerCarryAsk {
	readonly item: CarriedItem;
	readonly start: readonly [number, number];
	readonly isHome: (x: number, y: number) => boolean;
	readonly onTaken: () => void;
}

const NO_BUTTONS = 0;
const START_PX = 6;
const ESCAPE = "Escape";

export class PointerCarry {
	private isOut = false;
	private unmuteSelection: (() => void) | null = null;
	private last: readonly [number, number];

	constructor(private readonly ask: PointerCarryAsk) {
		this.last = ask.start;
	}

	listen(): void {
		window.addEventListener("pointermove", this.moved);
		window.addEventListener("pointerup", this.ended);
		window.addEventListener("pointercancel", this.cancelled);
		window.addEventListener("keydown", this.escaped, true);
	}

	private readonly moved = (event: PointerEvent): void => {
		if (event.buttons === NO_BUTTONS) {
			this.cancelled();
			return;
		}

		this.last = [event.clientX, event.clientY];
		const [startX, startY] = this.ask.start;
		const isFar = Math.hypot(this.last[0] - startX, this.last[1] - startY) >= START_PX;

		if (isFar && this.unmuteSelection === null) {
			this.unmuteSelection = muteTextSelection();
		}

		if (isFar && !this.ask.isHome(...this.last)) {
			this.isOut = this.say("over");
			return;
		}

		this.leave();
	};

	private readonly ended = (event: PointerEvent): void => {
		this.stop();
		this.last = [event.clientX, event.clientY];

		if (this.isOut && this.say("drop")) {
			this.ask.onTaken();
		}
	};

	private readonly cancelled = (): void => {
		this.stop();
		this.leave();
	};

	private readonly escaped = (event: KeyboardEvent): void => {
		if (event.key === ESCAPE) {
			this.cancelled();
		}
	};

	private leave(): void {
		if (this.isOut) {
			this.say("leave");
			this.isOut = false;
		}
	}

	private stop(): void {
		this.unmuteSelection?.();
		this.unmuteSelection = null;
		window.removeEventListener("pointermove", this.moved);
		window.removeEventListener("pointerup", this.ended);
		window.removeEventListener("pointercancel", this.cancelled);
		window.removeEventListener("keydown", this.escaped, true);
	}

	private say(phase: CarryPhase): boolean {
		return announceCarry({
			phase,
			item: this.ask.item,
			x: this.last[0],
			y: this.last[1],
		});
	}
}
