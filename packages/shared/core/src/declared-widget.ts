import { createElement as h, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { defaultImplementationFor } from "./gateway/defaults";
import { gatewayOverImplementation, isImplementation } from "./gateway/adapted";
import type { AdaptedGateway } from "./gateway/adapted";
import { stableKey } from "@widgetarium/framework/gateway/stable-key";
import { declarationIn, defaultOf } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { Declaration } from "./gateway/declaration";
import { askedReadOf } from "./gateway/asked-read";
import type { AskedRead, AskedShape } from "./gateway/asked-read";
import { shutHostFor } from "@widgetarium/framework/gateway/handler-context";
import { isObject } from "@widgetarium/framework/is-object";
import { useSlotsGiven } from "./slot-nodes.js";
import { implementationOfFunction, isQueryFunction } from "./gateway/function-handler.js";
import { useCommandOver } from "./declared-command.js";
import { useCollectionProp, useValueProp } from "./declared-reads.js";
import type { PropRead } from "./declared-reads.js";

const NOT_READ = "A prop could not be read";
const NOT_DECLARED = 'prop "{name}" declares no gateway interface';

export type GivenProps = Readonly<Record<string, unknown>>;
export type DrawnProps = Readonly<Record<string, unknown>>;

export interface InjectedWidget {
	(given: GivenProps): ReactNode;
	readonly declared: DeclaredProps;
}

type Hand = (name: string, declaration: Declaration, given: GivenProps) => unknown;

export interface ReadState {
	readonly loading: readonly string[];
	readonly failures: readonly string[];
}

export interface DeclaredWidgetOptions {
	readonly drawsFailures: boolean;
	readonly handsRefusals: boolean;
}

const DRAWN_BY_ENGINE: DeclaredWidgetOptions = { drawsFailures: false, handsRefusals: false };

const declaredInterfaces = new WeakMap<Declaration, unknown>();

const HANDED: Readonly<Partial<Record<Declaration["kind"], Hand>>> = {
	passed: (_name, declaration, given) =>
		declaration.passed === undefined ? null : (given[declaration.passed] ?? null),
	slot: (name, _declaration, given) => fieldOf(given["slots"], name) ?? given[name] ?? null,
};

export function createDeclaredWidget(
	props: DeclaredProps,
	draw: (drawn: DrawnProps, read: ReadState) => ReactNode,
	{ drawsFailures, handsRefusals }: DeclaredWidgetOptions = DRAWN_BY_ENGINE,
): InjectedWidget {
	const declared = Object.entries(props).map(([name, held]) => [name, declarationOfInterface(held)] as const);
	const reads = declared.filter(([, declaration]) => declaration?.kind !== "command");
	const commands = declared.filter((entry): entry is readonly [string, Declaration] => entry[1]?.kind === "command");
	function DrawnWidget({ drawn, read }: { readonly drawn: DrawnProps; readonly read: ReadState }): ReactNode {
		return draw(drawn, read);
	}
	function InjectedWidget(given: GivenProps): ReactNode {
		const drawn: Record<string, unknown> = {};
		const failures: string[] = [];
		const loading: string[] = [];
		const readGatewayIds: string[] = [];
		for (const [name, declaration] of reads) {
			const read = readOf(name, declaration, given);
			drawn[name] = read.value;
			if (read.gatewayId) readGatewayIds.push(read.gatewayId);
			if (read.failure) failures.push(`${name}: ${read.failure}`);
			if (read.isLoading) loading.push(name);
		}
		for (const [name, declaration] of commands)
			drawn[name] = useCommandOver({ name, declaration, given: given[name], readGatewayIds, handsRefusals });
		if (failures.length > 0 && !drawsFailures) return notReadNotice(failures);
		return h(DrawnWidget, { drawn, read: { loading, failures } });
	}
	InjectedWidget.declared = props;
	return InjectedWidget;
}

export function notReadNotice(failures: readonly string[]): ReactElement {
	return h("div", { className: "wg-error" }, [
		h("b", { key: "what" }, NOT_READ),
		...failures.map((said) => h("code", { key: said }, said)),
	]);
}

export function useProp(name: string, declaration: Declaration, given: unknown): PropRead {
	const gateway = useGateway(name, declaration, given);
	const { input, output } = declaration;
	if (input && output)
		return { value: useAskedRead(name, { input, output }, gateway), failure: null, gatewayId: gateway.id };
	if (gateway.kind === "collection")
		return { value: useCollectionProp(name, declaration, gateway), failure: null, gatewayId: gateway.id };
	return { ...useValueProp(name, declaration, gateway), gatewayId: gateway.id };
}

function declarationOfInterface(held: unknown): Declaration | null {
	const declaration = declarationIn(held);
	if (declaration) declaredInterfaces.set(declaration, held);
	return declaration;
}

function readOf(name: string, declaration: Declaration | null, given: GivenProps): PropRead {
	if (!declaration) throw new TypeError(NOT_DECLARED.replace("{name}", name));
	if (declaration.kind === "mounts")
		return {
			value: useSlotsGiven(fieldOf(given["mounts"], name) ?? given[name], declaration.held?.single === true),
			failure: null,
		};
	const hand = HANDED[declaration.kind];
	if (hand) return { value: hand(name, declaration, given), failure: null };
	return useProp(name, declaration, given[name]);
}

function useAskedRead(name: string, shape: AskedShape, gateway: AdaptedGateway): AskedRead {
	return useMemo(() => askedReadOf(name, shape, gateway), [gateway]);
}

function useGateway(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	const isPlain = !isGateway(given) && !isImplementation(declaration, given) && typeof given !== "function";
	return useMemo(() => gatewayOver(name, declaration, given), [isPlain ? stableKey(given) : given]);
}

function gatewayOver(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	if (isGateway(given)) return given;
	if (isImplementation(declaration, given))
		return gatewayOverImplementation(name, declaration, given, { host: shutHostFor(name) });
	if (isQueryFunction(declaration, given))
		return gatewayOverImplementation(name, declaration, implementationOfFunction(declaration, given), {
			host: shutHostFor(name),
		});
	return gatewayOverGiven(name, declaration, given);
}

function gatewayOverGiven(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	const held = given === undefined ? defaultOf(declaration) : given;
	const Default = defaultImplementationFor(declaredInterfaces.get(declaration), name);
	const made = new Default(declaration.kind === "collection" ? { rows: held ?? [] } : { value: held });
	return gatewayOverImplementation(name, declaration, made, { host: shutHostFor(name) });
}

function isGateway(held: unknown): held is AdaptedGateway {
	return (
		isObject(held) &&
		typeof held["subscribe"] === "function" &&
		(held["kind"] === "collection" || held["kind"] === "value")
	);
}

function fieldOf(held: unknown, key: string): unknown {
	return isObject(held) ? held[key] : undefined;
}
