import { keepPreviousData, useQuery as useCachedQuery } from "@tanstack/react-query";
import { reasonOf } from "./answer";
import { useApp } from "./app-context";
import { queryOptionsOf } from "./query-options";
import type { AnyQuery, InputArgs, OutputOf } from "./request";
import { useWatchesWhileShown } from "./use-watched";

export interface OptionalQueryRead<Data> {
	readonly data: Data | null;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

export function useOptionalQuery<R extends AnyQuery>(
	request: R,
	...input: InputArgs<R>
): OptionalQueryRead<OutputOf<R>>;
export function useOptionalQuery(request: AnyQuery, sent?: unknown): OptionalQueryRead<unknown> {
	const started = useApp("useOptionalQuery");
	const read = useCachedQuery({ ...queryOptionsOf(started, request, sent), placeholderData: keepPreviousData });
	useWatchesWhileShown(started, request, sent);
	return {
		data: read.data ?? null,
		isLoading: read.isPending,
		failure: read.error === null ? null : reasonOf(read.error),
	};
}
