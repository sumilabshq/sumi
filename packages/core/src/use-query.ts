import { useProp } from "./declared-widget.js";
import { declaredHandlerOf } from "./handler-of.js";
import { portReadOf, startOf, usePortHandle } from "./port-handles.js";
import type { RowWithRef } from "./gateway/manifest";
import type { Page } from "./gateway/page";
import type { QueryAskContract, QueryRowsContract, QueryValueContract } from "./gateway/queries";
import type { AskedPagedQueryHandle, AskedQueryHandle, PagedQueryHandle, QueryHandle } from "./handle-types.js";

type PageAsk<In> = Omit<In, "cursor" | "limit"> & { readonly limit?: number };

export type QueryHandleOf<Q> =
	Q extends QueryAskContract<infer In, infer Out>
		? Out extends Page<infer Item>
			? AskedPagedQueryHandle<PageAsk<In>, RowWithRef<Item>>
			: AskedQueryHandle<In, Out | null>
		: Q extends QueryRowsContract<infer Held>
			? PagedQueryHandle<RowWithRef<Held>>
			: Q extends QueryValueContract<infer Held>
				? QueryHandle<Held | null>
				: never;

export function useQuery<Q extends object>(query: Q): QueryHandleOf<Q>;
export function useQuery(query: object): unknown {
	const { name, declaration } = declaredHandlerOf(query);
	const read = useProp(name, declaration, query);
	const held = { isLoading: read.isLoading ?? false, failure: read.failure };
	const port = usePortHandle(name, portReadOf(declaration, read.value), read.value, startOf(declaration), held);
	return port.value ?? { data: null, isLoading: false, failure: port.failure };
}
