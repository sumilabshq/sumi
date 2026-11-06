import type { ComponentType, ReactNode } from "react";
import type { DeclaredProps, DrawnProps, GivenProps } from "./gateway/declared";
import type {
	askedInput,
	askedOutput,
	commandInput,
	commandOutput,
	passedAs,
	queryRowHeld,
	valueHeld,
} from "./gateway/declared-types";
import type { RowWithRef } from "./gateway/manifest";
import type { PAGE_ITEM } from "./gateway/page";
import type { QueryValueContract } from "./gateway/queries";
import type {
	AskedPagedQueryHandle,
	AskedQueryHandle,
	CommandHandle,
	PagedQueryHandle,
	QueryHandle,
} from "@widgetarium/data-framework/handle-types";

export interface FailedViewProps {
	readonly failures: readonly string[];
}

type PageItemOf<Out> = Out extends { readonly [PAGE_ITEM]: infer Item } ? Item : never;

type AskedHandleOf<In, Out> = [PageItemOf<Out>] extends [never]
	? AskedQueryHandle<In, Out | null>
	: AskedPagedQueryHandle<Omit<In, "cursor">, RowWithRef<PageItemOf<Out>>>;

type IsCommand<C> = typeof commandInput extends keyof C ? true : false;

type IsValueQuery<C> = typeof valueHeld extends keyof C
	? C extends abstract new () => QueryValueContract<unknown>
		? true
		: false
	: false;

type IsQuery<C> = typeof askedOutput extends keyof C
	? true
	: typeof queryRowHeld extends keyof C
		? true
		: IsValueQuery<C>;

type ViewPropOf<C, Drawn> =
	IsCommand<C> extends true
		? C extends { readonly [commandInput]?: infer In; readonly [commandOutput]?: infer Out }
			? CommandHandle<In, Out>
			: never
		: typeof askedOutput extends keyof C
			? C extends { readonly [askedInput]?: infer In; readonly [askedOutput]?: infer Out }
				? AskedHandleOf<In, Out>
				: never
			: C extends { readonly [queryRowHeld]?: infer Held }
				? typeof queryRowHeld extends keyof C
					? PagedQueryHandle<RowWithRef<Held>>
					: never
				: IsValueQuery<C> extends true
					? QueryHandle<Drawn>
					: Drawn;

interface KeyRefused<Said extends string> {
	readonly "this inject key is refused": Said;
}

type EntryNamed<K, C> =
	IsQuery<C> extends true
		? K extends `${string}Query`
			? C
			: KeyRefused<"an IQuery key ends in Query">
		: IsCommand<C> extends true
			? K extends `${string}Command`
				? C
				: KeyRefused<"an ICommand key ends in Command">
			: C;

export type KindsNamed<P> = { readonly [K in keyof P]: EntryNamed<K, P[K]> };

declare const INJECTED: unique symbol;

export type Inject<P extends DeclaredProps> = P & { readonly [INJECTED]: P };

type Injected<I> = I extends { readonly [INJECTED]: infer P } ? P : I;

type ViewPropsOf<P> = { readonly [K in keyof P]: ViewPropOf<P[K], DrawnProps<P>[K]> };

export type InjectProps<I> = ViewPropsOf<Injected<I>>;

type IsExactly<Given, Wanted> = [Given] extends [Wanted] ? ([Wanted] extends [Given] ? true : false) : false;

export interface RefusedView<Wanted> {
	readonly "the view's props must be exactly InjectProps of the widget's inject": Wanted;
}

export type ViewChecked<Props, Wanted> = IsExactly<Props, Wanted> extends true ? unknown : RefusedView<Wanted>;

export type WidgetStatesOf<P> = Readonly<Record<string, GivenProps<P>>>;

type HandedKey<P> = { [K in keyof P]: typeof passedAs extends keyof P[K] ? K : never }[keyof P];

export type BuiltGivenProps<P> = GivenProps<Pick<P, HandedKey<P>>> & Required<GivenProps<Omit<P, HandedKey<P>>>>;

export type BuiltWidget<P extends DeclaredProps> = ((given: BuiltGivenProps<P>) => ReactNode) & {
	readonly declared: P;
	readonly states: WidgetStatesOf<P>;
};

export interface WidgetBuilder<P extends DeclaredProps> {
	inject<Q extends DeclaredProps>(ports: Inject<Q>): WidgetBuilder<Q>;
	states(states: WidgetStatesOf<P>): WidgetBuilder<P>;
	pending(view: ComponentType): WidgetBuilder<P>;
	failed(view: ComponentType<FailedViewProps>): WidgetBuilder<P>;
	render<Props>(view: ComponentType<Props> & ViewChecked<Props, InjectProps<P>>): BuiltWidget<P>;
}
