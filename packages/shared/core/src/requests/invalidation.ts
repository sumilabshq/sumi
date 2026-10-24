import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { stableKey } from "../gateway/stable-key";
import type { AnyQuery, SentOf } from "./request";

export const InvalidationSchema = z.object({
	query: z.string(),
	inputKey: z.string().nullable(),
});

export type Invalidation = z.output<typeof InvalidationSchema>;

export type InvalidatedQuery = AnyQuery | { readonly request: AnyQuery };

type QueryOf<L extends InvalidatedQuery> = L extends { readonly request: infer Q extends AnyQuery } ? Q : L;

export type Invalidate = <L extends InvalidatedQuery>(query: L, ...input: [input?: SentOf<QueryOf<L>>]) => void;

export type Invalidator = Readonly<Record<"invalidate", Invalidate>>;

export interface Invalidating {
	readonly module: string;
	readonly importedModuleNames: readonly string[];
	readonly owner: string;
}

const NOT_A_QUERY = "{owner} invalidates {name}, which is not a query";
const NOT_IMPORTED = '{owner} invalidates {name}, but module "{module}" does not import {queryModule}: add .imports()';

export function invalidateInto(collected: Invalidation[], { module, importedModuleNames, owner }: Invalidating) {
	return (query: InvalidatedQuery, ...input: [input?: unknown]): void => {
		const stamped = ("request" in query ? query.request : query).inModule(module);
		const said = (template: string): string =>
			template
				.replace("{owner}", owner)
				.replace("{name}", stamped.name)
				.replace("{module}", module)
				.replace("{queryModule}", stamped.module ?? module);

		if (stamped.kind !== "query") {
			throw new Error(said(NOT_A_QUERY));
		}

		if (stamped.module !== module && !importedModuleNames.includes(stamped.module ?? "")) {
			throw new Error(said(NOT_IMPORTED));
		}

		collected.push({
			query: stamped.name,
			inputKey: input.length === 0 ? null : stableKey(input[0]),
		});
	};
}

export class Invalidations {
	private readonly watchers = new Map<string, Set<() => void>>();

	constructor(private readonly queryClient: QueryClient) {}

	watch(queryName: string, changed: () => void): () => void {
		const held = this.watchers.get(queryName) ?? new Set<() => void>();
		held.add(changed);
		this.watchers.set(queryName, held);
		return () => void held.delete(changed);
	}

	apply(invalidated: readonly Invalidation[]): void {
		for (const { query, inputKey } of invalidated) {
			const queryKey = inputKey === null ? [query] : [query, inputKey];
			void this.queryClient.invalidateQueries({ queryKey, exact: inputKey !== null });

			for (const changed of [...(this.watchers.get(query) ?? [])]) {
				changed();
			}
		}
	}
}
