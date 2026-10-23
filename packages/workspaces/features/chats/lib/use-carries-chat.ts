import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CARRIED_CHAT, announceCarry, isPointInBox } from "@widgetarium/behaviors";
import type { CarriedItem, CarryPhase } from "@widgetarium/behaviors";

const PRIMARY_BUTTON = 0;
const START_PX = 6;
const COLUMN = "[data-shell-column]";
const ESCAPE = "Escape";

export function useCarriesChat(
	chat: Omit<CarriedItem, "kind">,
	onTaken: () => void,
): (event: ReactPointerEvent) => void {
	const { id, title } = chat;
	return useCallback(
		(event: ReactPointerEvent) => startCarry(event, { kind: CARRIED_CHAT, id, title }, onTaken),
		[id, title, onTaken],
	);
}

function startCarry(event: ReactPointerEvent, item: CarriedItem, onTaken: () => void): void {
	if (event.button !== PRIMARY_BUTTON) {
		return;
	}

	const column = event.currentTarget.closest(COLUMN);
	new ChatCarry({
		item,
		start: [event.clientX, event.clientY],
		isInColumn: (x, y) => column !== null && isPointInBox(column.getBoundingClientRect(), x, y),
		onTaken,
	}).listen();
}

interface CarryAsk {
	readonly item: CarriedItem;
	readonly start: readonly [number, number];
	readonly isInColumn: (x: number, y: number) => boolean;
	readonly onTaken: () => void;
}

class ChatCarry {
	private isOut = false;
	private last: readonly [number, number];

	constructor(private readonly ask: CarryAsk) {
		this.last = ask.start;
	}

	listen(): void {
		window.addEventListener("pointermove", this.moved);
		window.addEventListener("pointerup", this.ended);
		window.addEventListener("pointercancel", this.cancelled);
		window.addEventListener("keydown", this.escaped, true);
	}

	private readonly moved = (event: PointerEvent): void => {
		this.last = [event.clientX, event.clientY];
		const [startX, startY] = this.ask.start;
		const isFar = Math.hypot(this.last[0] - startX, this.last[1] - startY) >= START_PX;

		if (isFar && !this.ask.isInColumn(...this.last)) {
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
