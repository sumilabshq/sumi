export const CARRIED_TAB = "tab";
export const CARRIED_CHAT = "chat";
export const CARRIED_PANE = "pane";

const CARRIED_KINDS = [CARRIED_TAB, CARRIED_CHAT, CARRIED_PANE] as const;
const CARRY_PHASES = ["over", "leave", "drop"] as const;

export type CarriedKind = (typeof CARRIED_KINDS)[number];

export type CarryPhase = (typeof CARRY_PHASES)[number];

export interface CarriedItem {
	readonly kind: CarriedKind;
	readonly id: string;
	readonly title: string;
	readonly home?: string | null;
}

export interface CarryMoment {
	readonly phase: CarryPhase;
	readonly item: CarriedItem;
	readonly x: number;
	readonly y: number;
}

export interface PointBox {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

interface CarryDetail extends CarryMoment {
	isTaken: boolean;
}

const CARRY_EVENT = "wg-carry";

export function announceCarry(moment: CarryMoment): boolean {
	const detail: CarryDetail = {
		...moment,
		isTaken: false,
	};
	document.dispatchEvent(new CustomEvent<CarryDetail>(CARRY_EVENT, { detail }));
	return detail.isTaken;
}

export function listenToCarry(takes: (moment: CarryMoment) => boolean): () => void {
	const heard = (event: Event): void => {
		if (!(event instanceof CustomEvent) || !isCarryDetail(event.detail)) {
			return;
		}

		const detail = event.detail;
		detail.isTaken = takes(detail) || detail.isTaken;
	};
	document.addEventListener(CARRY_EVENT, heard);
	return () => document.removeEventListener(CARRY_EVENT, heard);
}

export function isPointInBox(box: PointBox, x: number, y: number): boolean {
	return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
}

function isCarryDetail(detail: unknown): detail is CarryDetail {
	return (
		isRecord(detail) &&
		CARRY_PHASES.some((phase) => phase === detail["phase"]) &&
		isCarriedItem(detail["item"]) &&
		typeof detail["x"] === "number" &&
		typeof detail["y"] === "number" &&
		typeof detail["isTaken"] === "boolean"
	);
}

function isCarriedItem(item: unknown): item is CarriedItem {
	return (
		isRecord(item) &&
		CARRIED_KINDS.some((kind) => kind === item["kind"]) &&
		typeof item["id"] === "string" &&
		typeof item["title"] === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
