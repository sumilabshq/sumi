import { createElement as h, useRef } from "react";
import type { ComponentType, ReactNode } from "react";
import { createDeclaredWidget, notReadNotice } from "./declared-widget.js";
import type { DrawnProps, InjectedWidget, ReadState } from "./declared-widget.js";
import { declarationIn, declareProps, defineStates, isDeclaredProps } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { Declaration } from "./gateway/declaration";
import { useCommandHandle } from "@widgetarium/framework/command-handle";
import { isDrawnCommand } from "./declared-command.js";
import { portReadOf, startOf, usePortHandle } from "./port-handles.js";
import type { PortView } from "./port-handles.js";
import { ViewBoundary } from "./view-boundary.js";
import type { BuiltWidget, FailedViewProps, Inject, KindsNamed, WidgetBuilder } from "./widget-builder-types.js";

type DrawnView = ComponentType<Readonly<Record<string, unknown>>>;

interface Built {
	readonly ports: DeclaredProps;
	readonly states: Readonly<Record<string, unknown>>;
	readonly pending: ComponentType | null;
	readonly failed: ComponentType<FailedViewProps> | null;
}

interface Port {
	readonly name: string;
	readonly declaration: Declaration | null;
	readonly start: unknown;
}

export function inject<const P extends DeclaredProps>(entries: P & KindsNamed<P>): Inject<P>;
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
	const ports: readonly Port[] = Object.entries(built.ports).map(([name, port]) => {
		const declaration = declarationIn(port);
		return { name, declaration, start: startOf(declaration) };
	});
	const draw = (drawn: DrawnProps, read: ReadState): ReactNode => {
		const shown = useRef(false);
		const views = ports.map((port) => [port.name, usePortView(port, drawn[port.name], read)] as const);
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

function usePortView({ name, declaration, start }: Port, drawn: unknown, read: ReadState): PortView {
	if (declaration?.kind === "command" && isDrawnCommand(drawn))
		return { value: useCommandHandle(name, drawn), isLoading: false, failure: null };
	const held = { isLoading: read.loading.includes(name), failure: null };
	return usePortHandle(name, portReadOf(declaration, drawn), drawn, start, held);
}
