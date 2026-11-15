import type { TweakAsk } from "../schema/asks.schema.js";
import type {
	AppliedTweak,
	Board,
	BoardTweaks,
	Canvas,
	Tweak,
	TweakControl,
	TweakValue,
} from "../schema/canvas.schema.js";
import { boardOf, boardsOnPage, missingBoardReason, missingPageReason, pageOf } from "./canvas-edits.js";
import type { EditDone, EditOrRefusal } from "./canvas-edits.js";

export interface TweakScope {
	readonly page: string;
	readonly board: string | null;
}

export interface TweakTarget extends TweakScope {
	readonly tweak: string;
}

export function scopeOf(
	canvas: Canvas,
	asked: { readonly page: string | null; readonly board: string | null },
): TweakScope | string {
	if (asked.board !== null) {
		const board = boardOf(canvas, asked.board);
		return board === null ? missingBoardReason(asked.board) : { page: board.page, board: board.id };
	}

	const page = asked.page ?? canvas.shownPage;
	return pageOf(canvas, page) === null ? missingPageReason(page) : { page, board: null };
}

export function tweaksOnPage(canvas: Canvas, page: string): readonly Tweak[] {
	return canvas.tweaks.filter((tweak) => tweak.page === page);
}

export function boardTweaksOnPage(canvas: Canvas, page: string): BoardTweaks[] {
	const onPage = tweaksOnPage(canvas, page);
	return boardsOnPage(canvas, page).map((board) => ({
		board: board.id,
		applied: tweaksAppliedTo(board, onPage).map(appliedOf),
	}));
}

function tweaksAppliedTo(board: Board, onPage: readonly Tweak[]): readonly Tweak[] {
	const own = onPage.filter((tweak) => tweak.board === board.id);
	const shared = onPage.filter((tweak) => tweak.board === null && !own.some(({ id }) => id === tweak.id));
	return [...shared, ...own];
}

function appliedOf({ id, control, value }: Tweak): AppliedTweak {
	return {
		id,
		value,
		css: cssOf(control, value),
	};
}

function cssOf(control: TweakControl, value: TweakValue): string {
	if (typeof value === "boolean") {
		return value ? "1" : "0";
	}

	return control.kind === "number" ? `${value}${control.unit}` : `${value}`;
}

export function withWrittenTweaks(
	canvas: Canvas,
	scope: TweakScope,
	asked: readonly TweakAsk[],
): EditOrRefusal<TweakScope> {
	const refusal = asked.map((ask) => refuseTweak(ask, asked)).find((reason) => reason !== null);

	if (refusal !== undefined && refusal !== null) {
		return refusal;
	}

	const kept = canvas.tweaks.filter((tweak) => !isInScope(tweak, scope));
	const written = asked.map((ask) => ({
		...ask,
		...scope,
		initial: ask.value,
	}));
	return {
		canvas: { ...canvas, tweaks: [...kept, ...written] },
		id: scope,
		reason: `tweaks of ${scopeWord(scope)} ${canvas.tweaks.length - kept.length} → ${written.length}`,
	};
}

function refuseTweak(ask: TweakAsk, asked: readonly TweakAsk[]): string | null {
	if (asked.filter(({ id }) => id === ask.id).length > 1) {
		return `tweak id "${ask.id}" is written twice; every tweak of one scope needs its own id`;
	}

	if (ask.control.kind === "number" && ask.control.min >= ask.control.max) {
		return `tweak "${ask.id}" has min ${ask.control.min} not below max ${ask.control.max}`;
	}

	return refuseValue(ask.id, ask.control, ask.value);
}

function refuseValue(id: string, control: TweakControl, value: TweakValue): string | null {
	if (control.kind === "number") {
		const isInRange = typeof value === "number" && value >= control.min && value <= control.max;
		return isInRange ? null : `tweak "${id}" takes a number from ${control.min} to ${control.max}, not ${value}`;
	}

	if (control.kind === "toggle") {
		return typeof value === "boolean" ? null : `tweak "${id}" is a toggle and takes true or false, not ${value}`;
	}

	const isOption = typeof value === "string" && control.options.includes(value);
	return isOption ? null : `tweak "${id}" takes one of ${control.options.join(", ")}, not ${value}`;
}

export function withTweakValue(canvas: Canvas, target: TweakTarget, value: TweakValue): EditOrRefusal<string> {
	const was = canvas.tweaks.find((tweak) => isInScope(tweak, target) && tweak.id === target.tweak);

	if (was === undefined) {
		return `${scopeWord(target)} has no tweak "${target.tweak}"; read them with getTweaks`;
	}

	const refusal = refuseValue(was.id, was.control, value);

	if (refusal !== null) {
		return refusal;
	}

	const tweaks = canvas.tweaks.map((tweak) => (tweak === was ? { ...was, value } : tweak));
	return {
		canvas: { ...canvas, tweaks },
		id: was.id,
		reason: `tweak "${was.id}" of ${scopeWord(target)} ${was.value} → ${value}`,
	};
}

export function withResetTweaks(canvas: Canvas, page: string): EditDone<string> {
	const tweaks = canvas.tweaks.map((tweak) => (tweak.page === page ? { ...tweak, value: tweak.initial } : tweak));
	return {
		canvas: { ...canvas, tweaks },
		id: page,
		reason: `${tweaksOnPage(canvas, page).length} tweaks of ${page} back to their first values`,
	};
}

function isInScope(tweak: Tweak, scope: TweakScope): boolean {
	return tweak.page === scope.page && tweak.board === scope.board;
}

function scopeWord({ page, board }: TweakScope): string {
	return board === null ? `page ${page}` : `artboard ${board}`;
}
