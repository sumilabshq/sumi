import { CARRIED_CHAT, CARRIED_TAB, announceCarry } from "@widgetarium/behaviors";
import { SectionListSchema } from "@widgetarium/app-host";
import type { CarriedItem, CarryPhase } from "@widgetarium/behaviors";
import type { PickedItem } from "./picked-item.js";
import type { TabRef } from "./tab-ref.js";

const ROW_WORDS = "[data-tabs-words]";

export class BoardCarry {
	private isOverBoard = false;
	private readonly item: CarriedItem | null;

	constructor(picked: PickedItem) {
		this.item = carriedItemOf(picked);
	}

	over(x: number, y: number): void {
		if (!this.announced("over", x, y)) {
			this.leave(x, y);
			return;
		}

		this.isOverBoard = true;
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

function carriedItemOf({ source, element }: PickedItem): CarriedItem | null {
	if (source.kind !== "tab") {
		return null;
	}

	const title = (element.querySelector(ROW_WORDS)?.textContent ?? element.textContent ?? "").trim();
	return source.isHolder ? { kind: CARRIED_CHAT, id: source.id, title } : carriedTabOf(source, title);
}

function carriedTabOf({ id, list }: TabRef, title: string): CarriedItem {
	return {
		kind: CARRIED_TAB,
		id,
		title,
		home: SectionListSchema.safeParse(list).success ? null : list,
	};
}
