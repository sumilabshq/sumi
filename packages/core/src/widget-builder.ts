import { createElement as h, useCallback, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { z } from "zod";
import { createDeclaredWidget, notReadNotice } from "./declared-widget.js";
import type { DrawnProps, InjectedWidget, ReadState } from "./declared-widget.js";
import { metaOf } from "./gateway/create";
import { declarationIn, declareProps, defineStates, isDeclaredProps } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { Declaration } from "./gateway/declaration";
import { useAnswer } from "./gateway/use-data";
import type { DataState, PageState } from "./gateway/use-data";
import { ViewBoundary } from "./view-boundary.js";
import type { BuiltWidget, FailedViewProps, Inject, WidgetBuilder } from "./widget-builder-types.js";

type PortRead = "as-drawn" | "page" | "asked" | "asked-page" | "rows";

type PortDecision = PortRead | { readonly mismatch: string };

type DrawnView = ComponentType<Readonly<Record<string, unknown>>>;

type Answer = DataState<unknown> | PageState<unknown>;

interface Built {
	readonly ports: DeclaredProps;
	readonly states: Readonly<Record<string, unknown>>;
	readonly pending: ComponentType | null;
	readonly failed: ComponentType<FailedViewProps> | null;
}

interface PortView {
	readonly value: unknown;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

const NOT_ASKED = Symbol("not asked");
const PAGE_WINDOW_KEYS: readonly string[] = ["cursor", "limit"];
const READ_OTHERWISE = "was declared {declared} but arrived {stamped}";
const NOT_A_PAGE = "was stamped paged but answered no page";
const NOT_ROWS = "was stamped a list but answered no rows";
const UNPAGED_ANSWERED_PAGE = "was stamped unpaged but answered a page";

export function inject<const P extends DeclaredProps>(entries: P): Inject<P>;
export function inject(entries: DeclaredProps): DeclaredProps {
	return declareProps(entries);
}

export function widget(): WidgetBuilder<{}> {
	return builderOf({ ports: declareProps({}), states: {}, pending: null, failed: null });
}

function builderOf<P extends DeclaredProps>(built: Built): WidgetBuilder<P> {
	return {
		inject: (ports) => builderOf({ ...built, ports: isDeclaredProps(ports) ? ports : declareProps(ports) }),
		states: (states) => builderOf({ ...built, states: defineStates({ declared: built.ports }, states) }),
		pending: (view) => builderOf({ ...built, pending: view }),
		failed: (view) => builderOf({ ...built, failed: view }),
		render: (view) => renderedOf(built, view),
	};
}

function renderedOf<P extends DeclaredProps, Props>(built: Built, view: ComponentType<Props>): BuiltWidget<P>;
function renderedOf(built: Built, view: DrawnView): InjectedWidget & { readonly states: object } {
	const ports = Object.entries(built.ports).map(([name, port]) => [name, declarationIn(port), startOf(port)] as const);
	const draw = (drawn: DrawnProps, read: ReadState): ReactNode => {
		const shown = useRef(false);
		const views = ports.map(
			([name, declaration, start]) =>
				[name, usePortView(portReadOf(declaration, drawn[name]), drawn[name], start)] as const,
		);
		const failures = [
			...read.failures,
			...views.flatMap(([name, one]) => (one.failure ? [`${name}: ${one.failure}`] : [])),
		];
		if (failures.length > 0) return built.failed ? h(built.failed, { failures }) : notReadNotice(failures);
		const isLoading = read.loading.length > 0 || views.some(([, one]) => one.isLoading);
		if (isLoading && !shown.current) return built.pending ? h(built.pending) : null;
		shown.current = true;
		const props = { ...drawn, ...Object.fromEntries(views.map(([name, one]) => [name, one.value])) };
		return h(ViewBoundary, { failed: built.failed }, h(view, props));
	};
	const created = createDeclaredWidget(built.ports, draw, { drawsFailures: true, handsRefusals: true });
	return Object.assign(created, { states: built.states });
}

function portReadOf(declaration: Declaration | null, drawn: unknown): PortDecision {
	const meta = metaOf(drawn);
	const declared = declaredReadOf(declaration);
	const stamped = meta?.verb === "query" ? "asked" : meta?.verb === "list" ? "rows" : "as-drawn";
	if (declared !== stamped)
		return { mismatch: READ_OTHERWISE.replace("{declared}", declared).replace("{stamped}", stamped) };
	if (stamped !== "asked" || meta?.isPaged !== true) return stamped;
	return declaration?.input && isPageWindow(declaration.input) ? "page" : "asked-page";
}

function declaredReadOf(declaration: Declaration | null): "as-drawn" | "asked" | "rows" {
	if (!declaration || declaration.kind === "command") return "as-drawn";
	if (declaration.input && declaration.output) return "asked";
	return declaration.isQuery && declaration.kind === "collection" ? "rows" : "as-drawn";
}

function isPageWindow(input: z.ZodType): boolean {
	return input instanceof z.ZodObject && Object.keys(input.shape).every((key) => PAGE_WINDOW_KEYS.includes(key));
}

function startOf(port: unknown): unknown {
	const input = declarationIn(port)?.input;
	if (!input) return undefined;
	return input.safeParse({}).success ? {} : NOT_ASKED;
}

function usePortView(kind: PortDecision, drawn: unknown, start: unknown): PortView {
	const [asked, setAsked] = useState<unknown>(start);
	const ask = useCallback((input: unknown) => setAsked(input), []);
	const isRead = kind !== "as-drawn" && typeof kind === "string" && asked !== NOT_ASKED;
	const answer = useAnswer(isRead ? drawn : null, isRead ? asked : undefined);
	if (typeof kind !== "string") return { value: null, isLoading: false, failure: kind.mismatch };
	if (kind === "as-drawn") return { value: drawn, isLoading: false, failure: null };
	const { isLoading, failure } = answer;
	if (failure) return { value: null, isLoading, failure };
	return { ...shapedOf(kind, answer, ask), isLoading };
}

function shapedOf(kind: Exclude<PortRead, "as-drawn">, answer: Answer, ask: (input: unknown) => void) {
	if (kind === "rows") return isList(answer.data) || answer.data === null ? rowsOf(answer) : refused(NOT_ROWS);
	if (kind === "asked") return isPageState(answer) ? refused(UNPAGED_ANSWERED_PAGE) : read({ data: answer.data, ask });
	if (!isPageState(answer)) return refused(NOT_A_PAGE);
	const { data, total, hasMore, more } = answer;
	if (kind === "page") return read({ items: data, total, hasMore, more });
	return read({ data, total, hasMore, more, ask });
}

function rowsOf(answer: Answer) {
	return read({ items: answer.data ?? [], total: answer.total, hasMore: false, more: noMore });
}

function read(value: unknown): { readonly value: unknown; readonly failure: null } {
	return { value, failure: null };
}

function refused(why: string): { readonly value: null; readonly failure: string } {
	return { value: null, failure: why };
}

function isPageState(answer: Answer): answer is PageState<unknown> {
	return "hasMore" in answer;
}

function isList(held: unknown): held is readonly unknown[] {
	return Array.isArray(held);
}

function noMore(): void {}
