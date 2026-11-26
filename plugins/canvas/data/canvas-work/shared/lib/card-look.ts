export interface CardBox {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface CardLook {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

export interface CardSize {
	readonly width: number;
	readonly height: number;
}

export interface PlacedBox {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface CardAim {
	readonly boards: readonly string[];
	readonly area: { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
}

export const CARD_SIZE: CardSize = { width: 720, height: 420 };

const HEAD_PX = 44;
const MARGIN_PX = 24;
const SCALE_LEAST = 0.02;
const SCALE_MOST = 2;

export function cardLookOf(box: CardBox, card: CardSize): CardLook {
	const width = card.width - 2 * MARGIN_PX;
	const height = card.height - HEAD_PX - 2 * MARGIN_PX;
	const scale = Math.min(SCALE_MOST, Math.max(SCALE_LEAST, Math.min(width / box.width, height / box.height)));
	return {
		scale,
		x: placedOn(MARGIN_PX, width, box.x, box.width, scale),
		y: placedOn(HEAD_PX + MARGIN_PX, height, box.y, box.height, scale),
	};
}

export function aimedBoxOf(aim: CardAim, pageBoards: readonly PlacedBox[]): CardBox | null {
	if (aim.area !== null) {
		return { x: aim.area.x, y: aim.area.y, width: aim.area.w, height: aim.area.h };
	}

	const framed = pageBoards.filter(({ id }) => aim.boards.includes(id));
	return framed.length === 0 ? null : boxAround(framed);
}

export function boxAround(boards: readonly PlacedBox[]): CardBox {
	const x = Math.min(...boards.map((board) => board.x));
	const y = Math.min(...boards.map((board) => board.y));
	return {
		x,
		y,
		width: Math.max(...boards.map((board) => board.x + board.w)) - x,
		height: Math.max(...boards.map((board) => board.y + board.h)) - y,
	};
}

function placedOn(start: number, room: number, at: number, size: number, scale: number): number {
	if (size * scale > room) {
		return start - at * scale;
	}

	return start + room / 2 - (at + size / 2) * scale;
}
