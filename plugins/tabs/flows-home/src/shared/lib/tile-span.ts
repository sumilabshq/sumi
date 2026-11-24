import { MAX_APP_SPAN } from "@sumi/home-layout/contract";

export const APP_COLUMNS = 6;

export interface SpanDrag {
	readonly startX: number;
	readonly startSpan: number;
	readonly columnPx: number;
}

export function spanAfterDrag({ startX, startSpan, columnPx }: SpanDrag, pointerX: number): number {
	const moved = Math.round((pointerX - startX) / columnPx);
	return Math.min(MAX_APP_SPAN, Math.max(1, startSpan + moved));
}
