import { useCallback, useSyncExternalStore } from "react";
import { useApp } from "./app-context";
import { NOT_READ } from "./query-store";
import type { AnyQuery, InputArgs, OutputOf } from "./request";

export interface OptionalQueryRead<Data> {
	readonly data: Data | null;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

export function useOptionalQuery<R extends AnyQuery>(
	request: R,
	...input: InputArgs<R>
): OptionalQueryRead<OutputOf<R>>;
export function useOptionalQuery(request: AnyQuery, input?: unknown): OptionalQueryRead<unknown> {
	const { queries } = useApp("useOptionalQuery");
	const key = queries.keyOf(request, input);
	const subscribe = useCallback((listener: () => void) => queries.subscribe(request, input, listener), [queries, key]);
	const entry = useSyncExternalStore(subscribe, () => queries.peek(key) ?? NOT_READ);
	return { data: entry.data, isLoading: entry.status === "loading", failure: entry.failure };
}
