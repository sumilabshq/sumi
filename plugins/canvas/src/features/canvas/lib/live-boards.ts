export interface BoardBox {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface FieldView {
	readonly look: { readonly x: number; readonly y: number; readonly scale: number };
	readonly width: number;
	readonly height: number;
	readonly originPx: number;
}

const VIEW_MARGIN_SHARE = 0.25;

interface ScreenBox {
	readonly id: string;
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

function screenBoxOf(board: BoardBox, { look, originPx }: FieldView): ScreenBox {
	const left = (originPx + board.x) * look.scale + look.x;
	const top = (originPx + board.y) * look.scale + look.y;
	return {
		id: board.id,
		left,
		top,
		right: left + board.w * look.scale,
		bottom: top + board.h * look.scale,
	};
}

export function boardsInView(boards: readonly BoardBox[], view: FieldView): readonly string[] {
	if (view.width <= 0 || view.height <= 0) {
		return [];
	}

	const marginX = view.width * VIEW_MARGIN_SHARE;
	const marginY = view.height * VIEW_MARGIN_SHARE;
	const distanceToCentre = ({ left, top, right, bottom }: ScreenBox): number =>
		Math.hypot((left + right) / 2 - view.width / 2, (top + bottom) / 2 - view.height / 2);

	return boards
		.map((board) => screenBoxOf(board, view))
		.filter(
			({ left, top, right, bottom }) =>
				right > -marginX && left < view.width + marginX && bottom > -marginY && top < view.height + marginY,
		)
		.sort((a, b) => distanceToCentre(a) - distanceToCentre(b))
		.map(({ id }) => id);
}

export function liveBoardIds(
	inView: readonly string[],
	loaded: ReadonlySet<string>,
	loadingId: string | null,
): ReadonlySet<string> {
	return new Set(inView.filter((id) => loaded.has(id) || id === loadingId));
}

export function nextToLoad(inView: readonly string[], loaded: ReadonlySet<string>): string | null {
	return inView.find((id) => !loaded.has(id)) ?? null;
}
