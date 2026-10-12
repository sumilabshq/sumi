import { createElement as h, useCallback, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { z } from "zod";
import { createDeclaredWidget, notReadNotice } from "./declared-widget.js";
import type { DrawnProps, InjectedWidget, ReadState } from "./declared-widget.js";
import { declarationIn, declareProps, defineStates, isDeclaredProps } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import { isPageSchema } from "./gateway/page";
import { useAnswer } from "./gateway/use-data";
import type { DataState, PageState } from "./gateway/use-data";
import type { BuiltWidget, FailedViewProps, ViewProps, WidgetBuilder } from "./widget-builder-types.js";

type PortRead = "as-drawn" | "page" | "asked" | "asked-page" | "rows";

type DrawnView = ComponentType<Readonly<Record<string, unknown>>>;

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

export function widget(): WidgetBuilder<{}> {
	return builderOf({ ports: declareProps({}), states: {}, pending: null, failed: null });
}

function builderOf<P extends DeclaredProps>(built: Built): WidgetBuilder<P> {
	return {
		inject: (ports) => builderOf({ ...built, ports: isDeclaredProps(ports) ? ports : declareProps(ports) }),
		states: (states) => builderOf({ ...built, states: defineStates({ declared: built.ports }, states) }),
		pending: (view) => builderOf({ ...built, pending: view }),
		failed: (view) => builderOf({ ...built, failed: view }),
		render: (view: ComponentType<ViewProps<P>>): BuiltWidget<P> => renderedOf(built, view),
	};
}

function renderedOf<P extends DeclaredProps>(built: Built, view: ComponentType<ViewProps<P>>): BuiltWidget<P>;
function renderedOf(built: Built, view: DrawnView): InjectedWidget & { readonly states: object } {
	const reads = Object.entries(built.ports).map(([name, port]) => [name, portReadOf(port), startOf(port)] as const);
	const draw = (drawn: DrawnProps, read: ReadState): ReactNode => {
		const shown = useRef(false);
		const views = reads.map(([name, kind, start]) => [name, usePortView(kind, drawn[name], start)] as const);
		const failures = [
			...read.failures,
			...views.flatMap(([name, one]) => (one.failure ? [`${name}: ${one.failure}`] : [])),
		];
		if (failures.length > 0) return built.failed ? h(built.failed, { failures }) : notReadNotice(failures);
		const isLoading = read.loading.length > 0 || views.some(([, one]) => one.isLoading);
		if (isLoading && !shown.current) return built.pending ? h(built.pending) : null;
		shown.current = true;
		return h(view, { ...drawn, ...Object.fromEntries(views.map(([name, one]) => [name, one.value])) });
	};
	const created = createDeclaredWidget(built.ports, draw, true);
	return Object.assign(created, { states: built.states });
}

function portReadOf(port: unknown): PortRead {
	const declaration = declarationIn(port);
	if (!declaration) return "as-drawn";
	const { input, output } = declaration;
	if (input && output) {
		if (!isPageSchema(output)) return "asked";
		return isPageWindow(input) ? "page" : "asked-page";
	}
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

function usePortView(kind: PortRead, drawn: unknown, start: unknown): PortView {
	const [asked, setAsked] = useState<unknown>(start);
	const ask = useCallback((input: unknown) => setAsked(input), []);
	const isRead = kind !== "as-drawn" && asked !== NOT_ASKED;
	const answer = useAnswer(isRead ? drawn : null, isRead ? asked : undefined);
	if (kind === "as-drawn") return { value: drawn, isLoading: false, failure: null };
	const { isLoading, failure } = answer;
	if (kind === "page") return { value: pagedOf(answer), isLoading, failure };
	if (kind === "rows") return { value: rowsOf(answer), isLoading, failure };
	if (kind === "asked-page") {
		const { items, ...paged } = pagedOf(answer);
		return { value: { ...paged, data: items, ask }, isLoading, failure };
	}
	return { value: { data: isPageState(answer) ? null : answer.data, ask }, isLoading, failure };
}

function pagedOf(answer: DataState<unknown> | PageState<unknown>) {
	if (!isPageState(answer)) return { ...rowsOf(answer) };
	const { data, total, hasMore, more } = answer;
	return { items: data, total, hasMore, more };
}

function rowsOf(answer: DataState<unknown> | PageState<unknown>) {
	const items = isList(answer.data) ? answer.data : [];
	return { items, total: answer.total, hasMore: false, more: noMore };
}

function isPageState(answer: DataState<unknown> | PageState<unknown>): answer is PageState<unknown> {
	return "hasMore" in answer;
}

function isList(held: unknown): held is readonly unknown[] {
	return Array.isArray(held);
}

function noMore(): void {}
