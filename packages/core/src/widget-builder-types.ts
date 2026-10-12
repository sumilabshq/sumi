import type { ComponentType } from "react";
import type { DeclaredProps, DrawnProps, GivenProps } from "./gateway/declared";
import type { askedInput, askedOutput, queryRowHeld } from "./gateway/declared-types";
import type { RowWithRef } from "./gateway/manifest";
import type { PAGE_ITEM } from "./gateway/page";
import type { CreatedWidget } from "./widget-api";

export interface PagedView<Item> {
	readonly items: readonly Item[];
	readonly total: number | null;
	readonly hasMore: boolean;
	readonly more: () => void;
}

export interface AskedView<In, Data> {
	readonly data: Data;
	readonly ask: (input: In) => void;
}

export type AskedPagedView<In, Item> = AskedView<Omit<In, "cursor">, readonly Item[]> & Omit<PagedView<Item>, "items">;

export interface FailedViewProps {
	readonly failures: readonly string[];
}

type PageItemOf<Out> = Out extends { readonly [PAGE_ITEM]: infer Item } ? Item : never;

type IsPageWindow<In> = [Exclude<keyof In, "cursor" | "limit">] extends [never] ? true : false;

type AskedViewOf<In, Out> = [PageItemOf<Out>] extends [never]
	? AskedView<In, Out | null>
	: IsPageWindow<In> extends true
		? PagedView<RowWithRef<PageItemOf<Out>>>
		: AskedPagedView<In, RowWithRef<PageItemOf<Out>>>;

type ViewPropOf<C, Drawn> = C extends { readonly [askedInput]?: infer In; readonly [askedOutput]?: infer Out }
	? AskedViewOf<In, Out>
	: C extends { readonly [queryRowHeld]?: infer Held }
		? PagedView<RowWithRef<Held>>
		: Drawn;

export type ViewProps<P> = { readonly [K in keyof P]: ViewPropOf<P[K], DrawnProps<P>[K]> };

export type WidgetStatesOf<P> = Readonly<Record<string, GivenProps<P>>>;

export type BuiltWidget<P extends DeclaredProps> = CreatedWidget<P> & { readonly states: WidgetStatesOf<P> };

export interface WidgetBuilder<P extends DeclaredProps> {
	inject<const Q extends DeclaredProps>(ports: Q): WidgetBuilder<Q>;
	states(states: WidgetStatesOf<P>): WidgetBuilder<P>;
	pending(view: ComponentType): WidgetBuilder<P>;
	failed(view: ComponentType<FailedViewProps>): WidgetBuilder<P>;
	render(view: ComponentType<ViewProps<P>>): BuiltWidget<P>;
}
