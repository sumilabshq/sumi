import { useSuspenseQuery } from "@tanstack/react-query";
import { useRuntime } from "./runtime-context";
import { queryOptionsOf } from "./query-options";
import type { AnyQuery, InputArgs, OutputOf } from "./request";
import { useWatchesWhileShown } from "./use-watched";

export interface QueryRead<Data> {
	readonly data: Data;
}

export function useQuery<R extends AnyQuery>(request: R, ...input: InputArgs<R>): QueryRead<OutputOf<R>>;
export function useQuery(request: AnyQuery, sent?: unknown): QueryRead<unknown> {
	const started = useRuntime("useQuery");
	const read = useSuspenseQuery(queryOptionsOf(started, request, sent));
	useWatchesWhileShown(started, request, sent);
	return { data: read.data };
}
