import { use, useCallback, useSyncExternalStore } from "react";
import { useApp } from "./app-context";
import { RequestFailed } from "./request-failed";
import type { AnyQuery, InputArgs, OutputOf } from "./request";

export interface QueryRead<Data> {
	readonly data: Data;
}

export function useQuery<R extends AnyQuery>(request: R, ...input: InputArgs<R>): QueryRead<OutputOf<R>>;
export function useQuery(request: AnyQuery, input?: unknown): QueryRead<unknown> {
	const { queries } = useApp("useQuery");
	const key = queries.keyOf(request, input);
	const subscribe = useCallback((listener: () => void) => queries.subscribe(request, input, listener), [queries, key]);
	const shown = useSyncExternalStore(subscribe, () => queries.start(request, input));
	if (shown.status === "loading") use(shown.read);
	const entry = queries.peek(key) ?? shown;
	if (entry.status === "failed") throw new RequestFailed(entry.failure ?? request.name);
	return { data: entry.data };
}
