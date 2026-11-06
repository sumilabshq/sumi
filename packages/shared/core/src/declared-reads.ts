import { useMemo } from "react";
import { refuseVerb } from "./gateway/create";
import type { CollectionGateway, Query, ValueGateway } from "@widgetarium/framework/gateway/contract";
import { useData } from "./gateway/use-data";
import { defaultOf } from "./gateway/declared";
import type { Declaration } from "./gateway/declaration";
import { withManyVerbs } from "./gateway/many";
import type { EveryValueVerb } from "@widgetarium/framework/gateway/needs";
import { checkCollectionWrites, checkValueUpdate } from "./gateway/parsed";

const NOT_PICKED = 'prop "{name}" did not pick {verb}, so the widget cannot {verb}';
const MANY_OF: Readonly<Record<string, string>> = { create: "createMany", update: "updateMany", remove: "removeMany" };

type ValueHeldGateway = ValueGateway<unknown, EveryValueVerb>;

export interface PropRead {
	readonly value: unknown;
	readonly failure: string | null;
	readonly isLoading?: boolean;
	readonly gatewayId?: string;
}

export function useCollectionProp(
	name: string,
	declaration: Declaration,
	gateway: CollectionGateway<unknown>,
): unknown {
	return useMemo(() => {
		if (declaration.isQuery) return queryReadOf(gateway);
		return keepOnlyPicked(name, declaration, withManyVerbs({ ...checkCollectionWrites(gateway, declaration, name) }));
	}, [gateway]);
}

export function useValueProp(name: string, declaration: Declaration, gateway: ValueHeldGateway): PropRead {
	const { data, failure, isLoading } = useData(gateway.get);
	const value = useMemo(() => valueOrDefault(declaration, data), [data]);
	const update = useMemo(() => checkValueUpdate(gateway.update, declaration, name), [gateway.update]);
	if (declaration.writes.length === 0) return { value, failure, isLoading };
	const picked: Readonly<Record<string, unknown>> = { value, update, remove: gateway.remove };
	const verbs = [
		...(declaration.reads ?? ["get"]).map((verb) => (verb === "get" ? "value" : verb)),
		...declaration.writes,
	];
	return {
		value: Object.fromEntries(verbs.filter((verb) => verb in picked).map((verb) => [verb, picked[verb]] as const)),
		failure,
		isLoading,
	};
}

function queryReadOf(gateway: CollectionGateway<unknown>): unknown {
	const { list, get } = gateway;
	return Object.assign((input?: Query) => list(input), {
		can: () => list.can(),
		meta: Reflect.get(list, "meta"),
		get,
	});
}

function keepOnlyPicked(name: string, declaration: Declaration, drawn: object): object {
	const writes = declaration.writes;
	const upsert = writes.includes("create") && writes.includes("update") ? ["upsert"] : [];
	const manyWrites = writes.map((verb) => MANY_OF[verb]).filter((verb): verb is string => verb !== undefined);
	const picked = new Set([...(declaration.reads ?? []), ...writes, ...manyWrites, ...upsert]);
	const unpicked = Object.keys(drawn).filter(
		(verb) => typeof verbIn(drawn, verb) === "function" && verb !== "subscribe" && !picked.has(verb),
	);
	if (unpicked.length === 0) return drawn;
	const refused = unpicked.map(
		(verb) =>
			[verb, refuseVerb(verbIn(drawn, verb), NOT_PICKED.replace("{name}", name).split("{verb}").join(verb))] as const,
	);
	return { ...drawn, ...Object.fromEntries(refused) };
}

function valueOrDefault(declaration: Declaration, held: unknown): unknown {
	return held === null || held === undefined ? defaultOf(declaration) : held;
}

function verbIn(drawn: object, verb: string): unknown {
	return Reflect.get(drawn, verb);
}
