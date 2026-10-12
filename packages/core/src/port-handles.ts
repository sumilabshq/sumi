import { useCallback, useState } from "react";
import { z } from "zod";
import { metaOf } from "./gateway/create";
import type { Declaration } from "./gateway/declaration";
import { useAnswer } from "./gateway/use-data";
import type { DataState, PageState } from "./gateway/use-data";

type PortRead = "as-drawn" | "value" | "page" | "asked" | "asked-page" | "rows";

export type PortDecision = PortRead | { readonly mismatch: string };

type Answer = DataState<unknown> | PageState<unknown>;

export interface PortView {
	readonly value: unknown;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

export interface HeldRead {
	readonly isLoading: boolean;
	readonly failure: string | null;
}

const NOT_ASKED = Symbol("not asked");
const PAGE_WINDOW_KEYS: readonly string[] = ["cursor", "limit"];
const ASKED_READS: readonly PortRead[] = ["page", "asked", "asked-page", "rows"];
const READ_OTHERWISE = "was declared {declared} but arrived {stamped}";
const NOT_A_PAGE = "was stamped paged but answered no page";
const NOT_ROWS = "was stamped a list but answered no rows";
const UNPAGED_ANSWERED_PAGE = "was stamped unpaged but answered a page";

export function portReadOf(declaration: Declaration | null, drawn: unknown): PortDecision {
	const meta = metaOf(drawn);
	const declared = declaredReadOf(declaration);
	const stamped = meta?.verb === "query" ? "asked" : meta?.verb === "list" ? "rows" : "as-drawn";
	if (declared === "value" && stamped === "as-drawn") return "value";
	if (declared !== stamped)
		return { mismatch: READ_OTHERWISE.replace("{declared}", declared).replace("{stamped}", stamped) };
	if (stamped !== "asked" || meta?.isPaged !== true) return stamped;
	return declaration?.input && isPageWindow(declaration.input) ? "page" : "asked-page";
}

export function startOf(declaration: Declaration | null): unknown {
	const input = declaration?.input;
	if (!input) return undefined;
	return input.safeParse({}).success ? {} : NOT_ASKED;
}

export function usePortHandle(kind: PortDecision, drawn: unknown, start: unknown, held: HeldRead): PortView {
	const [asked, setAsked] = useState<unknown>(start);
	const ask = useCallback((input: unknown) => setAsked(input), []);
	const isRead = typeof kind === "string" && ASKED_READS.includes(kind) && asked !== NOT_ASKED;
	const answer = useAnswer(isRead ? drawn : null, isRead ? asked : undefined);
	if (typeof kind !== "string") return { value: null, isLoading: false, failure: kind.mismatch };
	if (kind === "as-drawn") return { value: drawn, isLoading: false, failure: null };
	if (kind === "value") return { value: { data: drawn, ...held }, ...held };
	const refusal = shapeRefusalOf(kind, answer);
	if (refusal !== null) return { value: null, isLoading: false, failure: refusal };
	const { isLoading, failure } = answer;
	return { value: { ...handleOf(kind, answer, ask), isLoading, failure }, isLoading, failure };
}

function declaredReadOf(declaration: Declaration | null): "as-drawn" | "value" | "asked" | "rows" {
	if (!declaration || declaration.kind === "command") return "as-drawn";
	if (declaration.input && declaration.output) return "asked";
	if (declaration.isQuery !== true) return "as-drawn";
	return declaration.kind === "collection" ? "rows" : "value";
}

function isPageWindow(input: z.ZodType): boolean {
	return input instanceof z.ZodObject && Object.keys(input.shape).every((key) => PAGE_WINDOW_KEYS.includes(key));
}

function shapeRefusalOf(kind: Exclude<PortRead, "as-drawn" | "value">, answer: Answer): string | null {
	if (kind === "rows") return isList(answer.data) || answer.data === null ? null : NOT_ROWS;
	if (kind === "asked") return isPageState(answer) ? UNPAGED_ANSWERED_PAGE : null;
	return isPageState(answer) ? null : NOT_A_PAGE;
}

function handleOf(kind: Exclude<PortRead, "as-drawn" | "value">, answer: Answer, ask: (input: unknown) => void) {
	if (kind === "rows") return { data: { items: isList(answer.data) ? answer.data : [] }, ...unpaged(answer) };
	if (!isPageState(answer)) return { data: answer.data, ask };
	const { data, total, hasMore, more } = answer;
	return { data: { items: data }, total, hasMore, more, ask };
}

function unpaged(answer: Answer) {
	return { total: answer.total, hasMore: false, more: noMore };
}

function isPageState(answer: Answer): answer is PageState<unknown> {
	return "hasMore" in answer;
}

function isList(held: unknown): held is readonly unknown[] {
	return Array.isArray(held);
}

function noMore(): void {}
