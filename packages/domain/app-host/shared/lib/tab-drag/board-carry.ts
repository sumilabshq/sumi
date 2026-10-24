import { CARRIED_TAB, announceCarry } from "@widgetarium/behaviors";
import type { CarriedItem, CarryPhase } from "@widgetarium/behaviors";
import type { PickedItem } from "./picked-item.js";

export class BoardCarry {
	private isOverBoard = false;
	private readonly item: CarriedItem | null;

	constructor({ source, element }: PickedItem) {
		this.item =
			source.kind === "tab"
				? {
						kind: CARRIED_TAB,
						id: source.id,
						title: element.textContent?.trim() ?? "",
					}
				: null;
	}

	over(x: number, y: number): boolean {
		const isTaken = this.announced("over", x, y);

		if (!isTaken) {
			this.leave(x, y);
			return false;
		}

		this.isOverBoard = true;
		return true;
	}

	leave(x: number, y: number): void {
		if (!this.isOverBoard) {
			return;
		}

		this.isOverBoard = false;
		this.announced("leave", x, y);
	}

	drop(x: number, y: number): boolean {
		if (!this.isOverBoard) {
			return false;
		}

		this.isOverBoard = false;
		return this.announced("drop", x, y);
	}

	private announced(phase: CarryPhase, x: number, y: number): boolean {
		if (this.item === null) {
			return false;
		}

		return announceCarry({
			phase,
			item: this.item,
			x,
			y,
		});
	}
}
